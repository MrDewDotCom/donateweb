import argparse
import asyncio
import sys

import edge_tts


async def main(text: str, voice: str, output_path: str) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.text, args.voice, args.output))
    except Exception as exc:  # noqa: BLE001
        print(f"edge-tts failed: {exc}", file=sys.stderr)
        sys.exit(1)
