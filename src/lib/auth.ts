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
            // Credentials provider - already validated in authorize()
            if (account?.provider === 'credentials') {
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

                // First login - assign google_sub
                if (!member.googleSub && account?.providerAccountId) {
                    await prisma.member.update({
                        where: { id: member.id },
                        data: {
                            googleSub: account.providerAccountId,
                            avatarUrl: user.image || member.avatarUrl,
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
