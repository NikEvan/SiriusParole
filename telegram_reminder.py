#!/usr/bin/env python3
"""
Sirius Parole — Promemoria giornaliero su Telegram.

Legge i messaggi da messaggi_telegram.txt, ne sceglie uno a caso nella fascia
richiesta (PRANZO o SERA) e lo invia al gruppo tramite il bot.

Non serve nessun server: viene eseguito da GitHub Actions.

Variabili d'ambiente richieste:
  TELEGRAM_BOT_TOKEN  token del bot ottenuto da @BotFather
  TELEGRAM_CHAT_ID    id del gruppo (per i gruppi e' un numero negativo)
  FASCIA              "pranzo", "sera", oppure la stringa cron dello schedule
  GAME_URL            (opzionale) indirizzo del gioco, sostituisce {link}
"""
import json
import os
import random
import sys
import urllib.error
import urllib.parse
import urllib.request

FILE_MESSAGGI = "messaggi_telegram.txt"
URL_DEFAULT = "https://nikevan.github.io/SiriusParole/"

# Il cron di mezzogiorno: serve a capire la fascia quando l'esecuzione e' schedulata
CRON_PRANZO_PREFIX = "23 10"


def leggi_messaggi(path):
    """Restituisce {'pranzo': [...], 'sera': [...]} leggendo il file dei messaggi."""
    sezioni = {"pranzo": [], "sera": []}
    corrente = None
    try:
        with open(path, encoding="utf-8") as f:
            righe = f.readlines()
    except FileNotFoundError:
        print(f"ERRORE: file {path} non trovato", file=sys.stderr)
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


def scegli_fascia(valore):
    """Deduce la fascia dal parametro: puo' essere esplicita o la stringa cron."""
    v = (valore or "").strip().lower()
    if v in ("pranzo", "sera"):
        return v
    if v.startswith(CRON_PRANZO_PREFIX):
        return "pranzo"
    return "sera"


def invia(token, chat_id, testo):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    dati = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": testo,
        "disable_web_page_preview": "true",
    }).encode()
    req = urllib.request.Request(url, data=dati)
    with urllib.request.urlopen(req, timeout=20) as r:
        risposta = json.loads(r.read())
    return risposta


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("ERRORE: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non impostati.",
              file=sys.stderr)
        sys.exit(1)

    fascia = scegli_fascia(os.environ.get("FASCIA"))
    link = os.environ.get("GAME_URL") or URL_DEFAULT

    sezioni = leggi_messaggi(FILE_MESSAGGI)
    lista = sezioni.get(fascia) or []
    if not lista:
        # Se la sezione e' vuota provo l'altra, per non restare senza messaggio
        altra = "sera" if fascia == "pranzo" else "pranzo"
        lista = sezioni.get(altra) or []
    if not lista:
        print("ERRORE: nessun messaggio disponibile nel file.", file=sys.stderr)
        sys.exit(1)

    testo = random.choice(lista).replace("{link}", link)
    print(f"Fascia: {fascia}  |  messaggi disponibili: {len(lista)}")
    print(f"Invio: {testo}")

    try:
        risposta = invia(token, chat_id, testo)
    except urllib.error.HTTPError as e:
        corpo = e.read().decode(errors="replace")
        print(f"ERRORE HTTP {e.code} da Telegram: {corpo}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERRORE invio: {e}", file=sys.stderr)
        sys.exit(1)

    if risposta.get("ok"):
        print("✅ Messaggio inviato.")
    else:
        print(f"ERRORE da Telegram: {risposta}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
