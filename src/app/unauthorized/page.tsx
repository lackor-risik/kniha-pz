import Link from 'next/link';

export default function UnauthorizedPage() {
    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--spacing-6)',
            textAlign: 'center'
        }}>
            <div style={{
                width: 80,
                height: 80,
                background: 'var(--color-error-light)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-6)',
                fontSize: '40px'
            }}>
                🚫
            </div>

            <h1 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                color: 'var(--color-gray-900)',
                marginBottom: 'var(--spacing-2)'
            }}>
                Prístup odmietnutý
            </h1>

            <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-gray-600)',
                maxWidth: 400,
                marginBottom: 'var(--spacing-6)'
            }}>
                Nemáte oprávnenie používať túto aplikáciu. Kontaktujte administrátora revíru, ak si myslíte, že by ste mali mať prístup.
            </p>

            <Link href="/login" className="btn btn-primary">
                Skúsiť iný účet
            </Link>
        </div>
    );
}
