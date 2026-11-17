#!/usr/bin/env python3
"""Generuje wiersze QR do js/config.js.  pip install qrcode;  python3 tools/make_qr.py HTTPS://TWOJA-STRONA.PL
Adres WIELKIMI literami mieści się w najmniejszym QR (21x21) — taki najlepiej czyta się z billboardu w grze."""
import sys, qrcode
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
q.add_data(sys.argv[1] if len(sys.argv) > 1 else 'HTTPS://GAMATIS.COM'); q.make(fit=True)
print(',\n'.join("    '%s'" % ''.join('1' if c else '0' for c in r) for r in q.get_matrix()))
