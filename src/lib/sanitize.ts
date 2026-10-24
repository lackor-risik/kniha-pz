import sanitizeHtml from 'sanitize-html';

// Allow-list matching what the TipTap RichTextEditor can produce.
export function sanitizeRichText(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 's', 'u', 'code', 'pre',
            'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'a', 'img',
        ],
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            ol: ['start'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesByTag: { img: ['http', 'https'] },
        allowProtocolRelative: false,
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
        },
    });
}
