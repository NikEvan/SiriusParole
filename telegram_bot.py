#!/usr/bin/env python3
"""
Sirius Parole — Bot Telegram (promemoria privati su iscrizione)

Due modalita', scelte con la variabile d'ambiente MODE:

  MODE=comandi     Legge i messaggi ricevuti dal bot e gestisce i comandi:
                     /notifiche     -> promemoria a mezzogiorno E la sera
                     /notifiche13   -> solo a mezzogiorno
                     /notifiche20   -> solo la sera
                     /stop          -> disattiva i promemoria
                     /start /aiuto  -> istruzioni
                   Risponde in privato a chi ha scritto.

  MODE=promemoria  Invia il promemoria in privato ai soli iscritti della fascia
                   indicata da FASCIA (pranzo | sera | stringa cron).

Le iscrizioni sono salvate su Firestore:
  telegram_subs/{user_id}   -> { fascia, nome, ts }
  telegram_state/bot        -> { offset }   (per non rileggere i messaggi vecchi)

NOTA: Telegram non permette a un bot di scrivere per primo a un utente.
Ogni persona deve aprire la chat col bot e premere Avvia almeno una volta.
"""
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import firebase_admin
from firebase_admin import credentials, firestore

FILE_MESSAGGI = "messaggi_telegram.txt"
URL_DEFAULT = "https://nikevan.github.io/SiriusParole/"
CRON_PRANZO_PREFIX = "23 10"

# Fasce valide salvate su Firestore
ENTRAMBE, PRANZO, SERA = "entrambe", "pranzo", "sera"


# ─────────────────────────── Telegram ───────────────────────────

def api(token, metodo, **parametri):
    url = f"https://api.telegram.org/bot{token}/{metodo}"
    dati = urllib.parse.urlencode(parametri).encode()
    req = urllib.request.Request(url, data=dati)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        corpo = e.read().decode(errors="replace")
        try:
            return json.loads(corpo)
        except Exception:
            return {"ok": False, "description": f"HTTP {e.code}: {corpo}"}
    except Exception as e:
        return {"ok": False, "description": str(e)}


def scrivi(token, chat_id, testo):
    return api(token, "sendMessage", chat_id=chat_id, text=testo,
               disable_web_page_preview="true")


# ─────────────────────────── Messaggi ───────────────────────────

def leggi_messaggi(path):
    sezioni = {"pranzo": [], "sera": []}
    corrente = None
    try:
        with open(path, encoding="utf-8") as f:
            righe = f.readlines()
    except FileNotFoundError:
        print(f"ATTENZIONE: {path} non trovato", file=sys.stderr)
        return sezioni
    for riga in righe:
        r = riga.strip()
        if not r or r.startswith("#"):
            continue
        if r.upper() == "[PRANZO]":
            corrente = "pranzo"
            continue
        if r.upper() == "[SERA]":
            corrente = "sera"
            continue
        if corrente:
            sezioni[corrente].append(r)
    return sezioni


def fascia_da_env(valore):
    v = (valore or "").strip().lower()
    if v in (PRANZO, SERA):
        return v
    if v.startswith(CRON_PRANZO_PREFIX):
        return PRANZO
    return SERA


# ─────────────────────────── Firestore ───────────────────────────

def init_db():
    sa = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not sa:
        print("ERRORE: FIREBASE_SERVICE_ACCOUNT non impostata", file=sys.stderr)
        sys.exit(1)
    cred = credentials.Certificate(json.loads(sa))
    firebase_admin.initialize_app(cred)
    return firestore.client()


def leggi_offset(db):
    try:
        snap = db.collection("telegram_state").document("bot").get()
        if snap.exists:
            return int(snap.to_dict().get("offset") or 0)
    except Exception as e:
        print(f"offset: {e}", file=sys.stderr)
    return 0


def salva_offset(db, offset):
    try:
        db.collection("telegram_state").document("bot").set(
            {"offset": int(offset), "ts": firestore.SERVER_TIMESTAMP})
    except Exception as e:
        print(f"salva offset: {e}", file=sys.stderr)


def salva_iscrizione(db, user_id, fascia, nome):
    db.collection("telegram_subs").document(str(user_id)).set({
        "fascia": fascia, "nome": nome, "ts": firestore.SERVER_TIMESTAMP,
    })


def rimuovi_iscrizione(db, user_id):
    db.collection("telegram_subs").document(str(user_id)).delete()


def leggi_iscritti(db, fascia):
    """Restituisce [(user_id, nome)] iscritti alla fascia richiesta."""
    out = []
    for doc in db.collection("telegram_subs").stream():
        d = doc.to_dict() or {}
        f = d.get("fascia")
        if f == ENTRAMBE or f == fascia:
            out.append((doc.id, d.get("nome") or ""))
    return out


# ─────────────────────────── Modalita' comandi ───────────────────────────

TESTO_AIUTO = (
    "Ciao! Sono il bot di Sirius Parole 🔤\n\n"
    "Posso ricordarti in privato di giocare la parola del giorno.\n\n"
    "Comandi disponibili:\n"
    "/notifiche — promemoria a mezzogiorno e la sera\n"
    "/notifiche13 — solo a mezzogiorno\n"
    "/notifiche20 — solo la sera\n"
    "/stop — non ricevere piu' promemoria\n\n"
    "Puoi cambiare idea quando vuoi, basta riscrivere un comando."
)

CONFERME = {
    ENTRAMBE: "Perfetto! ✅ Ti ricorderò di giocare due volte al giorno, "
              "verso mezzogiorno e verso sera.\nScrivi /stop se cambi idea.",
    PRANZO:   "Perfetto! ✅ Ti ricorderò di giocare verso mezzogiorno.\n"
              "Scrivi /notifiche per averlo anche la sera, o /stop per disattivare.",
    SERA:     "Perfetto! ✅ Ti ricorderò di giocare verso sera.\n"
              "Scrivi /notifiche per averlo anche a mezzogiorno, o /stop per disattivare.",
}


def pulisci_comando(testo):
    """'/notifiche13@SiriusBot ciao' -> '/notifiche13'"""
    if not testo:
        return ""
    primo = testo.strip().split()[0]
    return primo.split("@")[0].lower()


def nome_utente(frm):
    nome = (frm.get("first_name") or "").strip()
    if frm.get("username"):
        nome = f"{nome} (@{frm['username']})".strip()
    return nome or str(frm.get("id"))


def modalita_comandi(token, db):
    offset = leggi_offset(db)
    print(f"Leggo gli aggiornamenti da offset {offset}")
    risposta = api(token, "getUpdates", offset=offset, timeout=0, limit=100)
    if not risposta.get("ok"):
        print(f"ERRORE getUpdates: {risposta.get('description')}", file=sys.stderr)
        sys.exit(1)

    aggiornamenti = risposta.get("result") or []
    print(f"Aggiornamenti ricevuti: {len(aggiornamenti)}")
    if not aggiornamenti:
        return

    ultimo = offset
    gestiti = 0
    gruppo = os.environ.get("TELEGRAM_CHAT_ID")

    for agg in aggiornamenti:
        ultimo = max(ultimo, int(agg.get("update_id", 0)))
        msg = agg.get("message") or agg.get("edited_message")
        if not msg:
            continue
        testo = msg.get("text") or ""
        cmd = pulisci_comando(testo)
        if not cmd.startswith("/"):
            continue

        frm = msg.get("from") or {}
        user_id = frm.get("id")
        if not user_id:
            continue
        nome = nome_utente(frm)
        privato = (msg.get("chat") or {}).get("type") == "private"

        if cmd in ("/notifiche", "/notifiche13", "/notifiche20", "/stop"):
            if cmd == "/stop":
                rimuovi_iscrizione(db, user_id)
                esito = scrivi(token, user_id,
                               "Fatto 👍 Non ti manderò più promemoria.\n"
                               "Scrivi /notifiche quando vuoi riattivarli.")
            else:
                fascia = {"/notifiche": ENTRAMBE,
                          "/notifiche13": PRANZO,
                          "/notifiche20": SERA}[cmd]
                salva_iscrizione(db, user_id, fascia, nome)
                esito = scrivi(token, user_id, CONFERME[fascia])
            gestiti += 1
            print(f"  {cmd} da {nome} -> {'ok' if esito.get('ok') else esito.get('description')}")

            # Se il bot non puo' scrivere in privato, avvisa una volta nel gruppo
            if not esito.get("ok") and not privato and gruppo:
                scrivi(token, gruppo,
                       f"{nome}, per ricevere i promemoria in privato devi prima "
                       f"aprire la chat con me e premere Avvia 🙂")

        elif cmd in ("/start", "/aiuto", "/help"):
            scrivi(token, user_id, TESTO_AIUTO)
            gestiti += 1
            print(f"  {cmd} da {nome}")

        time.sleep(0.1)   # gentilezza verso i limiti di Telegram

    salva_offset(db, ultimo + 1)
    print(f"Comandi gestiti: {gestiti}. Nuovo offset: {ultimo + 1}")


# ─────────────────────────── Modalita' promemoria ───────────────────────────

def modalita_promemoria(token, db):
    fascia = fascia_da_env(os.environ.get("FASCIA"))
    link = os.environ.get("GAME_URL") or URL_DEFAULT

    sezioni = leggi_messaggi(FILE_MESSAGGI)
    lista = sezioni.get(fascia) or sezioni.get(SERA if fascia == PRANZO else PRANZO) or []
    if not lista:
        print("ERRORE: nessun messaggio disponibile.", file=sys.stderr)
        sys.exit(1)

    iscritti = leggi_iscritti(db, fascia)
    print(f"Fascia: {fascia} | iscritti da avvisare: {len(iscritti)}")
    if not iscritti:
        print("Nessun iscritto: niente da inviare.")
        return

    inviati, falliti = 0, 0
    for user_id, nome in iscritti:
        # Un messaggio diverso a testa: piu' vario e meno "automatico"
        testo = random.choice(lista).replace("{link}", link)
        esito = scrivi(token, user_id, testo)
        if esito.get("ok"):
            inviati += 1
        else:
            falliti += 1
            print(f"  ✗ {nome or user_id}: {esito.get('description')}")
        time.sleep(0.15)

    print(f"✅ Inviati: {inviati} | non riusciti: {falliti}")


# ─────────────────────────── Avvio ───────────────────────────

def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("ERRORE: TELEGRAM_BOT_TOKEN non impostato", file=sys.stderr)
        sys.exit(1)

    mode = (os.environ.get("MODE") or "").strip().lower()
    if mode not in ("comandi", "promemoria"):
        print("ERRORE: MODE deve essere 'comandi' o 'promemoria'", file=sys.stderr)
        sys.exit(1)

    db = init_db()
    if mode == "comandi":
        modalita_comandi(token, db)
    else:
        modalita_promemoria(token, db)


if __name__ == "__main__":
    main()
