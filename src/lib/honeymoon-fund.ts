/**
 * Honeymoon Fund — update copy and payment links here.
 * Set `href` to real URLs when ready; external links open in a new tab automatically.
 */

export type Bilingual = { en: string; es: string };

export const honeymoonFundHero = {
	title: {
		en: 'Support Our Next Chapter',
		es: 'Apoya nuestro siguiente capítulo',
	} satisfies Bilingual,
	subtitle: {
		en: 'Help Us Create Beautiful Memories Together',
		es: 'Ayúdanos a crear hermosos recuerdos juntos',
	} satisfies Bilingual,
	intro: {
		en: 'Your presence at our wedding means the world to us. If you would like to bless us with a gift, we would be grateful for your support as we begin this new chapter together.',
		es: 'Tu presencia en nuestra boda significa mucho para nosotros. Si deseas bendecirnos con un regalo, te agradecemos tu apoyo mientras comenzamos este nuevo capítulo juntos.',
	} satisfies Bilingual,
};

export type PaymentOption = {
	id: string;
	title: Bilingual;
	description: Bilingual;
	/** Button label — omit when no button is needed */
	buttonText?: Bilingual;
	/** Payment URL — use '#' until your real link is ready */
	href?: string;
	/** Disable the button until details or a link are ready */
	comingSoon?: boolean;
	/** Shown below the button when comingSoon is true (e.g. Zelle details coming soon) */
	placeholderText?: Bilingual;
};

export const paymentOptions: PaymentOption[] = [
	{
		id: 'venmo',
		title: { en: 'Venmo', es: 'Venmo' },
		description: {
			en: 'Send a gift directly through Venmo.',
			es: 'Envía un regalo directamente por Venmo.',
		},
		buttonText: { en: 'Give with Venmo', es: 'Regalar con Venmo' },
		href: 'https://venmo.com/code?user_id=2900764028567552046&created=1781382112',
	},
	{
		id: 'zelle',
		title: { en: 'Zelle', es: 'Zelle' },
		description: {
			en: 'Send through your bank using Zelle.',
			es: 'Envía desde tu banco usando Zelle.',
		},
		buttonText: { en: 'Give with Zelle: Rene Perez / 818-568-2932', es: 'Regalar con Zelle: Rene Perez / 818-568-2932' },
		href: '#',
	},
	{
		id: 'paypal',
		title: { en: 'PayPal', es: 'PayPal' },
		description: {
			en: 'Send a secure gift through PayPal.',
			es: 'Envía un regalo seguro por PayPal.',
		},
		buttonText: { en: 'Give with PayPal', es: 'Regalar con PayPal' },
		href: 'https://paypal.me/curveejay',
	},
	{
		id: 'card-box',
		title: { en: 'Card Box', es: 'Caja de tarjetas' },
		description: {
			en: 'We will also have a card box available at the wedding.',
			es: 'También tendremos una caja de tarjetas disponible en la boda.',
		},
	},
];

export type GiftIdea = {
	id: string;
	title: Bilingual;
	amount: Bilingual;
	/** Optional pictogram above the title — path under /public */
	image?: string;
	/** Payment URL — defaults to Venmo when omitted */
	href?: string;
};

export const giftIdeas: GiftIdea[] = [
	{
		id: 'dinner',
		title: { en: 'Dinner for Two', es: 'Cena para dos' },
		amount: { en: '$100', es: '$100' },
		image: '/images/dinner2.png',
	},
	{
		id: 'roundtrip',
		title: { en: 'Roundtrip fund', es: 'Fondo de ida y vuelta' },
		amount: { en: '$150', es: '$150' },
		image: '/images/roundtrip.png',
	},
	{
		id: 'getaway',
		title: { en: 'Weekend Getaway', es: 'Escapada de fin de semana' },
		amount: { en: '$200', es: '$200' },
		image: '/images/luggage.png',
	},
	{
		id: 'hotel',
		title: { en: 'Hotel Stay', es: 'Estancia en hotel' },
		amount: { en: '$250', es: '$250' },
		image: '/images/bedding.png',
	},
	{
		id: 'general',
		title: { en: 'General Gift', es: 'Regalo general' },
		amount: { en: 'Any Amount', es: 'Cualquier monto' },
		image: '/images/gift.png',
	},
];

export function isExternalPaymentLink(href: string | undefined): boolean {
	return Boolean(href && href !== '#' && /^https?:\/\//i.test(href));
}

export function getHoneymoonGiftHref(idea: GiftIdea): string {
	if (idea.href) return idea.href;
	const venmo = paymentOptions.find((o) => o.id === 'venmo' && o.href && o.href !== '#');
	return venmo?.href ?? '#';
}
