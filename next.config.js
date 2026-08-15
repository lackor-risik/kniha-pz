/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Disable auto-generated AGENTS.md/CLAUDE.md (Next.js 16 agentRules feature) -
    // we don't want them recreated on every `next dev` start.
    agentRules: false,
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
