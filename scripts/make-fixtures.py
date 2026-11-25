"""Generate local, untracked browser fixtures for the resource preview plugin."""
import gzip
import math
import os
import shutil
import sqlite3
import struct
import tarfile
import wave
import zipfile
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES = os.path.join(ROOT, 'test-fixtures')
os.makedirs(FIXTURES, exist_ok=True)


def wav():
    path = os.path.join(FIXTURES, 'sample.wav')
    with wave.open(path, 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(8000)
        out.writeframes(b''.join(
            struct.pack('<h', int(12000 * math.sin(2 * math.pi * 440 * index / 8000)))
            for index in range(8000)
        ))


def archives():
    image = os.path.join(ROOT, 'docs/user/guide/providers-custom-form.png')
    zip_path = os.path.join(FIXTURES, 'sample.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('readme.txt', 'hello from zip\n' * 100)
        archive.writestr('docs/', b'')
        if os.path.exists(image):
            archive.write(image, 'image.png')
    tar_path = os.path.join(FIXTURES, 'sample.tar')
    with tarfile.open(tar_path, 'w') as archive:
        archive.add(os.path.join(FIXTURES, 'sample.wav'), arcname='audio/sample.wav')
        if os.path.exists(image):
            archive.add(image, arcname='image.png')
    with open(tar_path, 'rb') as source, gzip.open(os.path.join(FIXTURES, 'sample.tar.gz'), 'wb') as target:
        shutil.copyfileobj(source, target)
    with gzip.open(os.path.join(FIXTURES, 'sample.txt.gz'), 'wb') as target:
        target.write(('hello gzip\n' * 1000).encode())
    with open(os.path.join(FIXTURES, 'corrupt.zip'), 'wb') as target:
        target.write(b'PK\x03\x04' + b'\x00' * 40)
    with zipfile.ZipFile(os.path.join(FIXTURES, 'bomb.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('big.bin', b'\x00' * (64 * 1024 * 1024))


def fonts_and_images():
    ttf = glob('/usr/share/fonts/**/*.ttf', recursive=True)
    if ttf:
        shutil.copyfile(ttf[0], os.path.join(FIXTURES, 'sample.ttf'))
    woff = glob(os.path.join(ROOT, 'apps/web/dist/assets/fonts/*.woff2'))
    if woff:
        shutil.copyfile(woff[0], os.path.join(FIXTURES, 'sample.woff2'))
    avif = glob(os.path.join(ROOT, 'node_modules/.pnpm/chrome-devtools-frontend*/node_modules/chrome-devtools-frontend/front_end/emulated_devices/optimized/*.avif'))
    if avif:
        shutil.copyfile(avif[0], os.path.join(FIXTURES, 'sample.avif'))


def binaries():
    with open(os.path.join(FIXTURES, 'sample.wasm'), 'wb') as target:
        target.write(b'\x00asm\x01\x00\x00\x00')
    database = os.path.join(FIXTURES, 'sample.sqlite')
    if os.path.exists(database):
        os.remove(database)
    connection = sqlite3.connect(database)
    connection.execute('create table t(x text)')
    connection.execute("insert into t values ('hello')")
    connection.commit()
    connection.close()


if __name__ == '__main__':
    wav()
    archives()
    fonts_and_images()
    binaries()
    print(sorted(os.listdir(FIXTURES)))
