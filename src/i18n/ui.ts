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
    "nav.writing": "Writing",
    "post.readMore": "Read the piece",
    "post.back": "Back to all posts",
    "post.empty": "Nothing here yet. Check back soon.",
    "theme.toggle": "Toggle theme",
    "lang.switch": "Switch language",
    "footer.rights": "Written by hand in Seoul.",
  },
  ko: {
    "site.title": "noowah",
    "site.tagline": "글로 남기는 생각들",
    "nav.writing": "글",
    "post.readMore": "글 읽기",
    "post.back": "목록으로",
    "post.empty": "아직 글이 없습니다. 곧 찾아오세요.",
    "theme.toggle": "테마 전환",
    "lang.switch": "언어 전환",
    "footer.rights": "서울에서 직접 씁니다.",
  },
} as const;

export function t(locale: Locale, key: keyof typeof ui["en"]): string {
  return ui[locale][key] ?? ui[defaultLocale][key];
}
