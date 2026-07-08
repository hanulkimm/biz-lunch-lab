"""동물의 숲 주민 데이터셋 빌드 스크립트.

커뮤니티 ACNH 데이터 스프레드시트(Norviah/animal-crossing 저장소)에서
주민 413명 데이터를 받아, 닮은꼴 매칭에 필요한 필드만 추린 한국어 포함
슬림 JSON을 backend/app/data/villagers.json 으로 생성한다.

실행 (backend 디렉토리에서):
    python db/build_villagers.py

게임 데이터라 바뀔 일이 없어 한 번만 실행하면 된다. 산출물은 git에 포함.
"""
import json
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/Norviah/animal-crossing"
    "/master/json/data/Villagers.json"
)
OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "villagers.json"

SPECIES_KO = {
    "Alligator": "악어", "Anteater": "개미핥기", "Bear": "곰", "Bear cub": "아기곰",
    "Bird": "새", "Bull": "황소", "Cat": "고양이", "Chicken": "닭", "Cow": "젖소",
    "Deer": "사슴", "Dog": "강아지", "Duck": "오리", "Eagle": "독수리",
    "Elephant": "코끼리", "Frog": "개구리", "Goat": "염소", "Gorilla": "고릴라",
    "Hamster": "햄스터", "Hippo": "하마", "Horse": "말", "Kangaroo": "캥거루",
    "Koala": "코알라", "Lion": "사자", "Monkey": "원숭이", "Mouse": "생쥐",
    "Octopus": "문어", "Ostrich": "타조", "Penguin": "펭귄", "Pig": "돼지",
    "Rabbit": "토끼", "Rhinoceros": "코뿔소", "Sheep": "양", "Squirrel": "다람쥐",
    "Tiger": "호랑이", "Wolf": "늑대",
}

PERSONALITY_KO = {
    "Big Sister": "누님", "Cranky": "무뚝뚝", "Jock": "운동광", "Lazy": "먹보(느긋)",
    "Normal": "친절", "Peppy": "아이돌(발랄)", "Smug": "젠틀", "Snooty": "성숙(도도)",
}

HOBBY_KO = {
    "Education": "지식탐구", "Fashion": "패션", "Fitness": "운동",
    "Music": "음악", "Nature": "자연", "Play": "놀이",
}


def build():
    print(f"다운로드: {SOURCE_URL}")
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as res:
        source = json.load(res)

    villagers = []
    for v in source:
        tr = v.get("translations") or {}
        cp = v.get("catchphrases") or {}
        month, day = (int(x) for x in v["birthday"].split("/"))
        villagers.append(
            {
                "id": v["filename"],                     # 예: cat23
                "name": v["name"],                       # 영어 이름
                "name_ko": tr.get("kRko") or v["name"],  # 한국어 이름
                "species": v["species"],
                "species_ko": SPECIES_KO.get(v["species"], v["species"]),
                "gender": v["gender"],
                "personality": v["personality"],
                "personality_ko": PERSONALITY_KO.get(v["personality"], v["personality"]),
                "hobby": v["hobby"],
                "hobby_ko": HOBBY_KO.get(v["hobby"], v["hobby"]),
                "birth_month": month,
                "birth_day": day,
                "catchphrase_ko": cp.get("kRko") or v.get("catchphrase", ""),
                "colors": v.get("colors", []),
                "styles": v.get("styles", []),
                "saying": v.get("favoriteSaying", ""),
                "icon": v["iconImage"],                  # 동그란 아이콘
                "photo": v["photoImage"],                # 증명사진(브로마이드)
                "bubble_color": v.get("bubbleColor", "#82C24A"),
                "name_color": v.get("nameColor", "#FFFFFF"),
            }
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(villagers, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"완료: {OUT_PATH} ({len(villagers)}명)")


if __name__ == "__main__":
    build()
