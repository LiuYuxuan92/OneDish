#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from io import BytesIO
from typing import Any

from google import genai
from PIL import Image
from google.genai import types

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'dev.sqlite3'
PUBLIC_DIR = ROOT / 'public' / 'generated'
RECIPES_DIR = PUBLIC_DIR / 'recipes'
COVERS_DIR = PUBLIC_DIR / 'covers'
MANIFEST_PATH = PUBLIC_DIR / 'manifest.json'

NEGATIVE_PROMPT = (
    'text, watermark, logo, collage, split layout, duplicated dish, messy table, '
    'hands, people, face, low resolution, blurry, oversaturated, cartoon, illustration'
)

HOME_COVER_PROMPT = (
    'Premium editorial food photography for a Chinese family meal planning app. '
    'Show one dish in two coordinated servings: one elegant adult plate and one smaller baby-friendly bowl, '
    'styled as “one dish, two ways”. Warm daylight, cream white and sage green background, light wood table, '
    'clean composition for a mobile app cover, realistic food texture, appetizing, refined, no people, no text, no watermark.'
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Generate OneDish recipe images with Vertex AI Imagen 4.')
    parser.add_argument('--project', default=os.getenv('GOOGLE_CLOUD_PROJECT', 'project-708841ba-a5b6-4440-aa6'))
    parser.add_argument('--location', default=os.getenv('VERTEX_IMAGE_LOCATION', 'global'))
    parser.add_argument('--model', default=os.getenv('VERTEX_IMAGE_MODEL', 'gemini-2.5-flash-image'))
    parser.add_argument('--fallback-models', default=os.getenv('VERTEX_IMAGE_FALLBACK_MODELS', 'gemini-3.1-flash-image-preview'))
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--skip-cover', action='store_true')
    parser.add_argument('--sleep', type=float, default=0.8)
    return parser.parse_args()


def ensure_dirs() -> None:
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    COVERS_DIR.mkdir(parents=True, exist_ok=True)


def load_manifest() -> dict[str, Any]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    return {
        'generated_at': None,
        'project': None,
        'location': None,
        'model': None,
        'home_cover': None,
        'recipes': {},
    }


def save_manifest(manifest: dict[str, Any]) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_json_field(value: Any) -> Any:
    if not value:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return value


def extract_ingredient_names(recipe_row: sqlite3.Row) -> list[str]:
    adult_version = parse_json_field(recipe_row['adult_version']) or {}
    baby_version = parse_json_field(recipe_row['baby_version']) or {}
    items = adult_version.get('ingredients') or baby_version.get('ingredients') or []
    names: list[str] = []
    for item in items:
        if isinstance(item, str):
            name = item.strip()
        elif isinstance(item, dict):
            name = str(item.get('name') or item.get('ingredient') or '').strip()
        else:
            name = ''
        if name and name not in names:
            names.append(name)
        if len(names) >= 5:
            break
    return names


def build_recipe_prompt(recipe_row: sqlite3.Row) -> str:
    stage = str(recipe_row['stage'] or 'adult').strip()
    meal_type = str(recipe_row['type'] or '').strip()
    name = str(recipe_row['name'] or '').strip()
    prep_time = recipe_row['prep_time'] or 0
    baby_version = parse_json_field(recipe_row['baby_version']) or {}
    ingredients = extract_ingredient_names(recipe_row)
    baby_age_range = str(baby_version.get('age_range') or '').strip()
    texture = str(baby_version.get('texture') or recipe_row['texture_level'] or '').strip()
    scene_tags = parse_json_field(recipe_row['scene_tags']) or []
    key_nutrients = parse_json_field(recipe_row['key_nutrients']) or []

    segments = [
        'Premium editorial food photography for a family recipe app.',
        f'Dish: {name}.',
        'Chinese home-cooked food, realistic and appetizing, warm natural daylight, soft shadow, gentle steam, clean ceramic tableware, light wood surface, cream-white and sage-green styling, high detail.',
        'Compose for a mobile recipe card with safe margins, simple uncluttered background, single main scene, no text, no watermark.',
    ]

    if meal_type == 'breakfast':
        segments.append('Breakfast scene, lighter and fresher plating.')
    elif meal_type == 'lunch':
        segments.append('Lunch scene, balanced everyday family meal styling.')
    elif meal_type == 'dinner':
        segments.append('Dinner scene, comforting home-cooked warmth with richer atmosphere.')

    if ingredients:
        segments.append(f'Key ingredients visible: {", ".join(ingredients)}.')

    if isinstance(scene_tags, list) and scene_tags:
        tags = '、'.join([str(item).strip() for item in scene_tags if str(item).strip()][:3])
        if tags:
            segments.append(f'Scene emphasis: {tags}.')

    if isinstance(key_nutrients, list) and key_nutrients:
        nutrients = '、'.join([str(item).strip() for item in key_nutrients if str(item).strip()][:3])
        if nutrients:
            segments.append(f'Nutritional focus suggested by the dish: {nutrients}.')

    if stage != 'adult':
        segments.append('Present it as a baby-friendly dish with a small safe portion in a clean baby bowl.')
        if baby_age_range:
            segments.append(f'Appropriate for baby stage: {baby_age_range}.')
        if texture:
            segments.append(f'Texture should read as {texture}.')
    elif baby_version:
        segments.append('Show the family main dish with a smaller baby-adapted portion beside it, expressing one dish two ways.')
        if baby_age_range:
            segments.append(f'The baby side serving should look appropriate for {baby_age_range}.')
        if texture:
            segments.append(f'The baby side serving should have a {texture} texture.')
    else:
        segments.append('Focus on the finished adult family dish as the hero subject.')

    if prep_time:
        segments.append(f'This is a quick home dish that can be ready in about {prep_time} minutes.')

    return ' '.join(segments)


def stable_seed(recipe_id: str) -> int:
    return int(hashlib.sha256(recipe_id.encode('utf-8')).hexdigest()[:8], 16)


def write_optimized_image(image_bytes: bytes, output_path: Path) -> None:
    with Image.open(BytesIO(image_bytes)) as image:
        rgb = image.convert('RGB')
        rgb.save(output_path, format='JPEG', quality=86, optimize=True, progressive=True)


def generate_with_retries(client: genai.Client, *, models: list[str], prompt: str, seed: int, output_path: Path, recipe_id: str) -> str:
    last_error: Exception | None = None
    max_attempts = max(6, len(models) * 3)
    for attempt in range(max_attempts):
        model = models[attempt % len(models)]
        try:
            generate_single_image(client, model=model, prompt=prompt, seed=seed, output_path=output_path)
            return model
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            message = str(exc)
            if '429' in message or 'RESOURCE_EXHAUSTED' in message or 'quota' in message.lower():
                wait_seconds = min(20 + attempt * 10, 90)
                print(f'  -> quota retry for {recipe_id} on {model}, waiting {wait_seconds}s', flush=True)
                time.sleep(wait_seconds)
                continue
            raise
    raise RuntimeError(f'Image generation failed after retries: {last_error}')


def generate_single_image(client: genai.Client, *, model: str, prompt: str, seed: int, output_path: Path) -> None:
    if model.startswith('imagen-'):
        response = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                numberOfImages=1,
                aspectRatio='4:3',
                outputMimeType='image/png',
                outputCompressionQuality=88,
                addWatermark=False,
                enhancePrompt=True,
                negativePrompt=NEGATIVE_PROMPT,
                seed=seed,
            ),
        )
        if not response.generated_images:
            raise RuntimeError('No image returned from Vertex AI')
        write_optimized_image(response.generated_images[0].image.image_bytes, output_path)
        return

    combined_prompt = f"{prompt} Avoid: {NEGATIVE_PROMPT}."
    response = client.models.generate_content(
        model=model,
        contents=combined_prompt,
        config=types.GenerateContentConfig(response_modalities=[types.Modality.TEXT, types.Modality.IMAGE]),
    )
    for cand in response.candidates or []:
        for part in cand.content.parts:
            inline = getattr(part, 'inline_data', None)
            if inline and getattr(inline, 'data', None):
                write_optimized_image(inline.data, output_path)
                return
    raise RuntimeError('No image returned from Gemini image model')


def update_recipe_image(conn: sqlite3.Connection, recipe_id: str, relative_url: str) -> None:
    conn.execute(
        'UPDATE recipes SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (json.dumps([relative_url], ensure_ascii=False), recipe_id),
    )
    conn.commit()


def main() -> int:
    args = parse_args()
    ensure_dirs()

    client = genai.Client(vertexai=True, project=args.project, location=args.location, http_options=types.HttpOptions(timeout=180000))
    manifest = load_manifest()
    manifest['project'] = args.project
    manifest['location'] = args.location
    models = [args.model, *[item.strip() for item in str(args.fallback_models or '').split(',') if item.strip() and item.strip() != args.model]]
    manifest['model'] = models

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        'SELECT id, name, type, prep_time, stage, adult_version, baby_version, scene_tags, key_nutrients, texture_level, image_url FROM recipes ORDER BY id ASC'
    ).fetchall()
    if args.limit and args.limit > 0:
        rows = rows[:args.limit]

    if not args.skip_cover:
        cover_rel = '/media/generated/covers/onedish-family-cover.jpg'
        cover_path = COVERS_DIR / 'onedish-family-cover.jpg'
        if args.force or not cover_path.exists():
            print(f'[cover] generating -> {cover_path.name}', flush=True)
            generate_with_retries(client, models=models, prompt=HOME_COVER_PROMPT, seed=20260316, output_path=cover_path, recipe_id='home_cover')
            time.sleep(args.sleep)
        manifest['home_cover'] = cover_rel
        save_manifest(manifest)

    total = len(rows)
    for index, row in enumerate(rows, start=1):
        recipe_id = str(row['id'])
        recipe_name = str(row['name'])
        relative_url = f'/media/generated/recipes/{recipe_id}.jpg'
        output_path = RECIPES_DIR / f'{recipe_id}.jpg'
        existing_image = str(row['image_url'] or '').strip()

        if output_path.exists() and not args.force:
            if existing_image != json.dumps([relative_url], ensure_ascii=False):
                update_recipe_image(conn, recipe_id, relative_url)
            manifest['recipes'][recipe_id] = {
                'name': recipe_name,
                'url': relative_url,
                'prompt': manifest.get('recipes', {}).get(recipe_id, {}).get('prompt', ''),
                'seed': stable_seed(recipe_id),
                'status': 'reused',
            }
            print(f'[{index}/{total}] reused {recipe_id} {recipe_name}', flush=True)
            save_manifest(manifest)
            continue

        prompt = build_recipe_prompt(row)
        try:
            used_model = generate_with_retries(
                client,
                models=models,
                prompt=prompt,
                seed=stable_seed(recipe_id),
                output_path=output_path,
                recipe_id=recipe_id,
            )
            update_recipe_image(conn, recipe_id, relative_url)
            manifest['recipes'][recipe_id] = {
                'name': recipe_name,
                'url': relative_url,
                'prompt': prompt,
                'seed': stable_seed(recipe_id),
                'status': 'generated',
                'model': used_model,
            }
            save_manifest(manifest)
            print(f'[{index}/{total}] generated {recipe_id} {recipe_name}', flush=True)
            time.sleep(args.sleep)
        except Exception as exc:  # noqa: BLE001
            manifest['recipes'][recipe_id] = {
                'name': recipe_name,
                'url': relative_url,
                'prompt': prompt,
                'seed': stable_seed(recipe_id),
                'status': 'failed',
                'error': str(exc),
            }
            save_manifest(manifest)
            print(f'[{index}/{total}] failed {recipe_id} {recipe_name}: {exc}', file=sys.stderr, flush=True)

    manifest['generated_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    save_manifest(manifest)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
