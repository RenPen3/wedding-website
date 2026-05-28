export const SLIDESHOW_SECTIONS = [
	{ id: 'getting_ready', en: 'Getting Ready', es: 'Preparativos' },
	{ id: 'ceremony', en: 'Ceremony', es: 'Ceremonia' },
	{ id: 'reception', en: 'Reception', es: 'Recepción' },
	{ id: 'family', en: 'Family', es: 'Familia' },
	{ id: 'friends', en: 'Friends', es: 'Amigos' },
	{ id: 'dancing', en: 'Dancing', es: 'Baile' },
	{ id: 'more_memories', en: 'More Memories', es: 'Más recuerdos' },
] as const;

export type SlideshowSectionId = (typeof SLIDESHOW_SECTIONS)[number]['id'];

export const SLIDESHOW_SECTION_IDS = SLIDESHOW_SECTIONS.map((s) => s.id);

export function isSlideshowSectionId(value: string): value is SlideshowSectionId {
	return (SLIDESHOW_SECTION_IDS as readonly string[]).includes(value);
}

export function sectionLabel(id: SlideshowSectionId, lang: 'en' | 'es' = 'en'): string {
	return SLIDESHOW_SECTIONS.find((s) => s.id === id)?.[lang] ?? id;
}
