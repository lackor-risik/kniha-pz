import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            image?: string;
            role: 'ADMIN' | 'MEMBER';
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: 'ADMIN' | 'MEMBER';
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Heslo', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const member = await prisma.member.findFirst({
                    where: {
                        email: {
                            equals: credentials.email,
                            mode: 'insensitive',
                        },
                    },
                });

                if (!member || !member.isActive) {
                    return null;
                }

                if (!member.passwordHash) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(
                    credentials.password,
                    member.passwordHash
                );

                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: member.id,
                    email: member.email,
                    name: member.displayName,
                    image: member.avatarUrl,
                };
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Credentials provider - update lastLoginAt
            if (account?.provider === 'credentials') {
                await prisma.member.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });
                return true;
            }

            // Google provider
            if (account?.provider === 'google') {
                if (!user.email) {
                    return false;
                }

                // Find member by email (case-insensitive)
                const member = await prisma.member.findFirst({
                    where: {
                        email: {
                            equals: user.email,
                            mode: 'insensitive',
                        },
                    },
                });

                // Member must exist and be active
                if (!member || !member.isActive) {
                    return '/unauthorized';
                }

                // Download and cache avatar as base64
                let avatarData: string | null = null;
                if (user.image) {
                    try {
                        const response = await fetch(user.image);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            const contentType = response.headers.get('content-type') || 'image/jpeg';
                            const base64 = Buffer.from(buffer).toString('base64');
                            avatarData = `data:${contentType};base64,${base64}`;
                        }
                    } catch (error) {
                        console.error('Failed to download avatar:', error);
                    }
                }

                // First login - assign google_sub
                if (!member.googleSub && account?.providerAccountId) {
                    await prisma.member.update({
                        where: { id: member.id },
                        data: {
                            googleSub: account.providerAccountId,
                            avatarUrl: user.image || member.avatarUrl,
                            avatarData: avatarData || member.avatarData,
                            lastLoginAt: new Date(),
                        },
                    });
                } else {
                    // Update lastLoginAt on every login, and avatar if we got a new one
                    await prisma.member.update({
                        where: { id: member.id },
                        data: {
                            ...(avatarData && { avatarUrl: user.image, avatarData }),
                            lastLoginAt: new Date(),
                        },
                    });
                }

                return true;
            }

            return false;
        },

        async jwt({ token, account, user }) {
            if (user?.email) {
                // For credentials, user.id is already the member ID
                if (account?.provider === 'credentials' && user.id) {
                    const member = await prisma.member.findUnique({
                        where: { id: user.id },
                    });
                    if (member) {
                        token.id = member.id;
                        token.role = member.role;
                    }
                } else if (account) {
                    // For Google, find member by email
                    const member = await prisma.member.findFirst({
                        where: {
                            email: {
                                equals: user.email,
                                mode: 'insensitive',
                            },
                        },
                    });

                    if (member) {
                        token.id = member.id;
                        token.role = member.role;
                    }
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }

            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
