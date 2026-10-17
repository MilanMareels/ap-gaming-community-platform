import type { Event } from '@/api';
import { HUB_LOCATION, ORGANIZATION, SITE_DESCRIPTION, SITE_NAME } from '@/util/seo';

type JsonLdData = Record<string, unknown>;

/** Renders schema.org structured data. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

const organizationId = (siteUrl: string) => `${siteUrl}/#organization`;

export function siteJsonLd(siteUrl: string): JsonLdData[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId(siteUrl),
      name: ORGANIZATION.name,
      alternateName: [SITE_NAME, 'AP Gaming'],
      url: siteUrl,
      description: SITE_DESCRIPTION,
      sameAs: ORGANIZATION.sameAs,
      parentOrganization: {
        '@type': 'CollegeOrUniversity',
        name: ORGANIZATION.parentName,
        url: ORGANIZATION.parentUrl,
      },
      location: hubPlace(),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: SITE_NAME,
      url: siteUrl,
      inLanguage: 'nl-BE',
      publisher: { '@id': organizationId(siteUrl) },
    },
  ];
}

export function eventJsonLd(event: Event, siteUrl: string, imagePath: string): JsonLdData {
  const url = `${siteUrl}/events/${event.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || `${event.title} in de ${SITE_NAME}.`,
    startDate: event.startTime,
    endDate: event.endTime,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: [`${siteUrl}${imagePath}`],
    location: hubPlace(),
    organizer: { '@type': 'Organization', '@id': organizationId(siteUrl), name: ORGANIZATION.name, url: siteUrl },
    inLanguage: 'nl-BE',
  };
}

function hubPlace(): JsonLdData {
  return {
    '@type': 'Place',
    name: HUB_LOCATION.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: HUB_LOCATION.streetAddress,
      postalCode: HUB_LOCATION.postalCode,
      addressLocality: HUB_LOCATION.addressLocality,
      addressCountry: HUB_LOCATION.addressCountry,
    },
  };
}
