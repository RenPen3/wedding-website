type SlideshowPhoto = {
	photo_id: string;
	url: string;
	uploaderName: string | null;
	display_order: number;
};

type SlideshowSection = {
	id: string;
	photos: SlideshowPhoto[];
};

type SectionLabel = { id: string; en: string; es: string };

function isEs() {
	return document.documentElement.classList.contains('lang-es');
}

function sectionTitle(labels: SectionLabel[], id: string) {
	const row = labels.find((l) => l.id === id);
	if (!row) return id;
	return isEs() ? row.es : row.en;
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;');
}

function renderSection(section: SlideshowSection, labels: SectionLabel[]) {
	const title = sectionTitle(labels, section.id);
	const slides = section.photos
		.map(
			(photo, index) => `
			<figure class="w-[min(85vw,18rem)] shrink-0 snap-center overflow-hidden rounded-2xl border border-mauve/15 bg-white shadow-sm sm:w-64">
				<button
					type="button"
					class="slideshow-open block w-full overflow-hidden"
					data-url="${photo.url}"
					data-caption="${escapeHtml(photo.uploaderName ?? `Photo ${index + 1}`)}"
				>
					<img
						src="${photo.url}"
						alt="${escapeHtml(photo.uploaderName ? `Photo by ${photo.uploaderName}` : 'Wedding photo')}"
						loading="lazy"
						class="aspect-[4/5] w-full object-cover transition duration-500 hover:scale-[1.02]"
					/>
				</button>
				${
					photo.uploaderName ?
						`<figcaption class="px-3 py-2 text-xs text-brown-muted">${escapeHtml(photo.uploaderName)}</figcaption>`
					:	''
				}
			</figure>`
		)
		.join('');

	return `
		<section class="slideshow-section" aria-label="${escapeHtml(title)}">
			<h3 class="font-serif text-2xl text-plum md:text-3xl">${escapeHtml(title)}</h3>
			<div class="slideshow-track mt-5 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">${slides}</div>
		</section>`;
}

function bindLightbox(root: HTMLElement) {
	root.querySelectorAll<HTMLButtonElement>('.slideshow-open').forEach((btn) => {
		btn.addEventListener('click', () => {
			const url = btn.dataset.url;
			if (url) window.open(url, '_blank', 'noopener,noreferrer');
		});
	});
}

export async function initSlideshowViewer() {
	const loading = document.getElementById('slideshow-loading');
	const empty = document.getElementById('slideshow-empty');
	const container = document.getElementById('slideshow-sections');
	const labelsEl = document.getElementById('slideshow-section-labels');

	if (!loading || !empty || !container || !labelsEl?.textContent) return;

	const labels = JSON.parse(labelsEl.textContent) as SectionLabel[];

	try {
		const res = await fetch('/api/slideshow');
		const data = (await res.json()) as {
			ok?: boolean;
			hasSlideshow?: boolean;
			sections?: SlideshowSection[];
		};

		loading.classList.add('hidden');

		if (!data.ok || !data.hasSlideshow || !data.sections?.length) {
			empty.classList.remove('hidden');
			return;
		}

		container.classList.remove('hidden');
		container.innerHTML = data.sections.map((section) => renderSection(section, labels)).join('');
		bindLightbox(container);
	} catch {
		loading.classList.add('hidden');
		empty.classList.remove('hidden');
	}
}

export async function reloadSlideshowViewer() {
	await initSlideshowViewer();
}
