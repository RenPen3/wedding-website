export type GalleryVariant = 'preview' | 'full';

export type GalleryPhoto = {
	id: string;
	url: string;
	uploadedAt: string;
	uploaderName: string | null;
};

type Lang = 'en' | 'es';

const TOKEN_STORAGE_KEY = 'wedding-uploaded-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const FILE_TOO_LARGE = {
	en: 'Image is too large. Please upload a photo under 5MB.',
	es: 'La imagen es demasiado grande. Sube una foto de menos de 5 MB.',
} satisfies Record<Lang, string>;

function isFileSizeError(message: string): boolean {
	return /5\s*mb|too large|smaller|file size|demasiado grande|menos de 5/i.test(message);
}

function mapUploadError(error?: string): string {
	if (error && isFileSizeError(error)) {
		return pick(FILE_TOO_LARGE);
	}
	return (
		error ??
		pick({
			en: 'Upload failed. Please try again.',
			es: 'La subida falló. Por favor intenta de nuevo.',
		})
	);
}

let uploadStatusTimeout: number | null = null;

function clearUploadStatusTimeout() {
	if (uploadStatusTimeout !== null) {
		window.clearTimeout(uploadStatusTimeout);
		uploadStatusTimeout = null;
	}
}

function showUploadError(statusEl: HTMLElement, message: string) {
	clearUploadStatusTimeout();
	statusEl.classList.remove('hidden', 'text-olive', 'text-mauve-dark');
	statusEl.classList.add('text-red-700');
	statusEl.textContent = message;
	uploadStatusTimeout = window.setTimeout(() => {
		statusEl.classList.add('hidden');
		statusEl.classList.remove('text-red-700');
		statusEl.textContent = '';
		uploadStatusTimeout = null;
	}, 6000);
}

function isEs(): boolean {
	return document.documentElement.classList.contains('lang-es');
}

function lang(): Lang {
	return isEs() ? 'es' : 'en';
}

function pick<T extends Record<Lang, string>>(t: T) {
	return t[lang()];
}

function readTokens(): Record<string, string> {
	try {
		return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) ?? '{}') as Record<string, string>;
	} catch {
		return {};
	}
}

function saveUploadToken(photoId: string, token: string) {
	const tokens = readTokens();
	tokens[photoId] = token;
	localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function getUploadToken(photoId: string): string | null {
	return readTokens()[photoId] ?? null;
}

function removeUploadToken(photoId: string) {
	const tokens = readTokens();
	delete tokens[photoId];
	localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderPhotoCard(photo: GalleryPhoto, variant: GalleryVariant) {
	const canDelete = variant === 'full' && Boolean(getUploadToken(photo.id));
	const alt = photo.uploaderName ? `Photo by ${photo.uploaderName}` : 'Wedding photo';

	return `
		<figure class="group relative overflow-hidden rounded-2xl border border-mauve/15 bg-white shadow-sm">
			<a href="${photo.url}" target="_blank" rel="noopener noreferrer" class="block aspect-square overflow-hidden">
				<img
					src="${photo.url}"
					alt="${escapeHtml(alt)}"
					loading="lazy"
					class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
				/>
			</a>
			${
				canDelete ?
					`<button
						type="button"
						class="photo-delete-btn absolute right-1.5 top-1.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-plum/90 text-cream shadow-md ring-2 ring-white/60 transition hover:bg-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
						data-photo-id="${photo.id}"
						aria-label="${pick({ en: 'Remove photo', es: 'Eliminar foto' })}"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true">
							<path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"></path>
						</svg>
					</button>`
				:	''
			}
			${
				photo.uploaderName ?
					`<figcaption class="px-3 py-2 text-xs text-brown-muted">${escapeHtml(photo.uploaderName)}</figcaption>`
				:	''
			}
		</figure>`;
}

async function loadGallery(options: { variant: GalleryVariant; limit?: number }) {
	const grid = document.getElementById('photo-gallery-grid');
	const empty = document.getElementById('photo-gallery-empty');
	const loading = document.getElementById('photo-gallery-loading');
	if (!grid || !empty || !loading) return;

	try {
		const query = options.limit ? `?limit=${options.limit}` : '';
		const res = await fetch(`/api/photos${query}`);
		const data = (await res.json()) as { ok?: boolean; photos?: GalleryPhoto[] };
		const photos = data.photos ?? [];

		loading.classList.add('hidden');

		if (photos.length === 0) {
			empty.classList.remove('hidden');
			grid.classList.add('hidden');
			grid.innerHTML = '';
			return;
		}

		empty.classList.add('hidden');
		grid.classList.remove('hidden');
		grid.innerHTML = photos.map((photo) => renderPhotoCard(photo, options.variant)).join('');

		grid.querySelectorAll<HTMLButtonElement>('.photo-delete-btn').forEach((btn) => {
			btn.addEventListener('click', async (event) => {
				event.preventDefault();
				event.stopPropagation();
				const photoId = btn.dataset.photoId;
				if (!photoId) return;

				const token = getUploadToken(photoId);
				if (!token) return;

				const confirmed = window.confirm(
					pick({
						en: 'Remove this photo from the gallery?',
						es: '¿Eliminar esta foto de la galería?',
					})
				);
				if (!confirmed) return;

				btn.disabled = true;
				try {
					const res = await fetch(`/api/photos/${photoId}`, {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token }),
					});
					const result = (await res.json()) as { ok?: boolean; error?: string };

					if (!res.ok || !result.ok) {
						window.alert(
							result.error ??
								pick({
									en: 'Could not remove this photo.',
									es: 'No se pudo eliminar esta foto.',
								})
						);
						btn.disabled = false;
						return;
					}

					removeUploadToken(photoId);
					await loadGallery(options);
				} catch {
					window.alert(
						pick({
							en: 'Network error. Please try again.',
							es: 'Error de red. Por favor intenta de nuevo.',
						})
					);
					btn.disabled = false;
				}
			});
		});
	} catch {
		loading.classList.add('hidden');
		empty.classList.remove('hidden');
		empty.innerHTML =
			'<span data-strand="en">Could not load photos.</span><span data-strand="es">No se pudieron cargar las fotos.</span>';
	}
}

function initUploadForm(onUploaded: () => Promise<void>) {
	const form = document.getElementById('photo-upload-form') as HTMLFormElement | null;
	if (!form) return;

	const fileInput = document.getElementById('photo-file') as HTMLInputElement | null;
	const previewWrap = document.getElementById('photo-upload-preview-wrap');
	const preview = document.getElementById('photo-upload-preview') as HTMLImageElement | null;
	const statusEl = document.getElementById('photo-upload-status');
	const submitBtn = document.getElementById('photo-upload-submit') as HTMLButtonElement | null;

	fileInput?.addEventListener('change', () => {
		const file = fileInput.files?.[0];
		if (!file || !preview || !previewWrap) {
			previewWrap?.classList.add('hidden');
			return;
		}
		preview.src = URL.createObjectURL(file);
		previewWrap.classList.remove('hidden');
	});

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!statusEl || !submitBtn) return;

		const fd = new FormData(form);
		const file = fd.get('photo');
		if (!(file instanceof File) || file.size === 0) {
			showUploadError(
				statusEl,
				pick({
					en: 'Please choose a photo first.',
					es: 'Por favor elige una foto primero.',
				})
			);
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			showUploadError(statusEl, pick(FILE_TOO_LARGE));
			return;
		}

		submitBtn.disabled = true;
		clearUploadStatusTimeout();
		statusEl.classList.remove('hidden', 'text-olive', 'text-mauve-dark', 'text-red-700');
		statusEl.textContent = pick({ en: 'Uploading…', es: 'Subiendo…' });

		try {
			const res = await fetch('/api/photos', { method: 'POST', body: fd });
			let data: {
				ok?: boolean;
				error?: string;
				photo?: GalleryPhoto & { uploadToken?: string };
			};

			try {
				data = (await res.json()) as typeof data;
			} catch {
				if (res.status === 413) {
					showUploadError(statusEl, pick(FILE_TOO_LARGE));
					return;
				}
				throw new Error('network');
			}

			if (!res.ok || !data.ok || !data.photo) {
				showUploadError(statusEl, mapUploadError(data.error));
				return;
			}

			if (data.photo.uploadToken) {
				saveUploadToken(data.photo.id, data.photo.uploadToken);
			}

			form.reset();
			previewWrap?.classList.add('hidden');
			if (preview) preview.removeAttribute('src');
			clearUploadStatusTimeout();
			statusEl.classList.remove('text-red-700', 'text-mauve-dark');
			statusEl.classList.add('text-olive');
			statusEl.textContent = pick({
				en: 'Thank you — your photo has been added.',
				es: 'Gracias — tu foto ha sido agregada.',
			});
			await onUploaded();
		} catch {
			showUploadError(
				statusEl,
				pick({
					en: 'Network error. Please try again.',
					es: 'Error de red. Por favor intenta de nuevo.',
				})
			);
		} finally {
			submitBtn.disabled = false;
		}
	});
}

export function initPhotoGallery(options: { variant: GalleryVariant; limit?: number }) {
	const reload = () => loadGallery(options);

	if (options.variant === 'full') {
		initUploadForm(reload);
	}

	void reload();
}
