"""Gera os arquivos de teste da paridade da abertura (tools/paridade-abrir.mjs): zip com ISO, zip com .cue+.bin, zip com .bin
grande, .bin e .iso de CD, ROM de N64 solta e em zip, ROM de GB solta e em zip. Tudo gerado (nenhum jogo de verdade).
Uso: python3 tools/paridade/arquivos.py <pasta>"""
import os, sys, zipfile

pasta = sys.argv[1]
os.makedirs(pasta, exist_ok=True)
os.chdir(pasta)
setor = bytes([0] + [0xFF] * 10 + [0])
cd_bin = (setor + bytes(2352 - 12)) * 32
open('Jogo CD.bin', 'wb').write(cd_bin)
open('Jogo.iso', 'wb').write(b'\0' * 0x8000 + b'\x01CD001' + b'\0' * 4000)
open('Mario.z64', 'wb').write(b'\x80\x37\x12\x40' + b'\0' * 4092)
gb = bytearray(32768)
gb[0x134:0x13c] = b'TESTEGB '
open('Jogo GB.gb', 'wb').write(bytes(gb))
with zipfile.ZipFile('CD com iso.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Jogo/Jogo.iso', b'\0' * 0x9000)
with zipfile.ZipFile('CD com cue.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Jogo.cue', 'FILE "Jogo.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n')
    z.writestr('Jogo.bin', cd_bin)
with zipfile.ZipFile('CD com bin grande.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Jogo (Track 1).bin', b'\0' * (17 << 20))
with zipfile.ZipFile('Mario.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Mario.z64', b'\x80\x37\x12\x40' + b'\0' * 4092)
with zipfile.ZipFile('Jogo GB.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('Jogo GB.gb', bytes(gb))

# Mega Drive que pinta o fundo (o mesmo do e2e): só o cabeçalho "SEGA" basta pra ser reconhecido
md = bytearray(0x400)
md[0x100:0x110] = b'SEGA MEGA DRIVE '
open('Vermelho.md', 'wb').write(bytes(md))
