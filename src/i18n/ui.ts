export const languages = {
  en: "English",
  ko: "한글",
} as const;

export type Locale = keyof typeof languages;

export const defaultLocale: Locale = "en";

export const ui = {
  en: {
    "site.title": "noowah",
    "site.tagline": "notes, in writing",
    "post.readMore": "Read the piece",
    "post.back": "Back to all posts",
    "post.empty": "Nothing here yet. Check back soon.",
    "post.toc": "On this page",
    "theme.toggle": "Toggle theme",
    "lang.switch": "Switch language",
    "footer.rights": "Written by hand in Seoul.",

    "area.dev.label": "Dev",
    "area.dev.description":
      "Engineering notes from the workshop — what I am building, and what broke on the way.",
    "area.dev.topic1": "AI agents and LLM tooling",
    "area.dev.topic2": "Infrastructure, deeper",
    "area.dev.topic3": "Design engineering",
    "area.hobbies.label": "Hobbies",
    "area.hobbies.description":
      "Off the clock. The things I take apart when nothing is on fire.",
    "area.hobbies.topic1": "Watches and watchmaking",
    "area.hobbies.topic2": "Music",
    "area.hobbies.topic3": "",

    "home.hero.line1": "Frontend developer",
    "home.hero.line2": "in Seoul,",
    "home.hero.line3": "writing it down.",
    "home.hero.lede":
      "Two notebooks: what I build at work, and what I take apart after. Both in English and Korean.",
    "home.areas.label": "The areas",
    "home.latest.label": "Latest",
    "home.latest.all": "See everything",
    "home.closing.label": "Elsewhere",
    "home.closing.text": "Frontend developer and team lead, building healthcare software.",
    "home.closing.portfolio": "Portfolio",
    "home.closing.github": "GitHub",
    "area.count.one": "post",
    "area.count.other": "posts",
    "area.empty.short": "Coming soon",
  },
  ko: {
    "site.title": "noowah",
    "site.tagline": "글로 남기는 생각들",
    "post.readMore": "글 읽기",
    "post.back": "목록으로",
    "post.empty": "아직 글이 없습니다. 곧 찾아오세요.",
    "post.toc": "목차",
    "theme.toggle": "테마 전환",
    "lang.switch": "언어 전환",
    "footer.rights": "서울에서 직접 씁니다.",

    "area.dev.label": "개발",
    "area.dev.description":
      "작업실에서 남기는 엔지니어링 기록 — 무엇을 만들고 있는지, 그리고 무엇이 망가졌는지.",
    "area.dev.topic1": "AI 에이전트와 LLM 도구",
    "area.dev.topic2": "인프라, 더 깊이",
    "area.dev.topic3": "디자인 엔지니어링",
    "area.hobbies.label": "취미",
    "area.hobbies.description": "퇴근 후. 불이 나지 않은 날에 분해해 보는 것들.",
    "area.hobbies.topic1": "시계와 시계 제작",
    "area.hobbies.topic2": "음악",
    "area.hobbies.topic3": "",

    "home.hero.line1": "서울의",
    "home.hero.line2": "프론트엔드 개발자,",
    "home.hero.line3": "기록합니다.",
    "home.hero.lede":
      "두 개의 노트: 일하며 만드는 것, 그리고 퇴근 후 분해하는 것. 영어와 한국어로 씁니다.",
    "home.areas.label": "영역",
    "home.latest.label": "최신 글",
    "home.latest.all": "전체 보기",
    "home.closing.label": "다른 곳에서",
    "home.closing.text": "헬스케어 소프트웨어를 만드는 프론트엔드 개발자이자 팀 리드입니다.",
    "home.closing.portfolio": "포트폴리오",
    "home.closing.github": "깃허브",
    "area.count.one": "개의 글",
    "area.count.other": "개의 글",
    "area.empty.short": "준비 중",
  },
} as const;

export function t(locale: Locale, key: keyof typeof ui["en"]): string {
  return ui[locale][key] ?? ui[defaultLocale][key];
}
