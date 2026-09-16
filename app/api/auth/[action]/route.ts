import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
    signInWithPassword,
    signUp,
    getUserFromToken,
    updateUser,
} from '@/lib/db/auth-server';
import { signToken, RECOVERY_TOKEN_TTL_SECONDS } from '@/lib/db/jwt';
import { pool } from '@/lib/db/pool';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authentication endpoints backing the client auth shim (lib/supabase.ts):
 *   POST /api/auth/login    { email, password }
 *   POST /api/auth/signup   { email, password, data }
 *   POST /api/auth/logout
 *   POST /api/auth/user     { password?, email?, data? }   (Bearer)
 *   GET  /api/auth/user                                    (Bearer)
 *   POST /api/auth/recover  { email, redirectTo }
 */

function bearerToken(request: NextRequest): string {
    return request.headers.get('authorization')?.replace('Bearer ', '') || '';
}

function clientIp(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const { action } = await params;
    if (action !== 'user') {
        return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }
    const token = bearerToken(request);
    const user = token ? await getUserFromToken(token) : null;
    if (!user) {
        return NextResponse.json({ error: { message: 'Invalid or expired token' } }, { status: 401 });
    }
    return NextResponse.json({ user });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const { action } = await params;
    let body: any = {};
    try {
        body = await request.json();
    } catch {
        // some actions (logout) have no body
    }

    try {
        switch (action) {
            case 'login': {
                const limit = checkRateLimit(`auth-login:${clientIp(request)}`, { maxRequests: 10, windowSeconds: 60 });
                if (!limit.success) {
                    return NextResponse.json(
                        { error: { message: 'Too many attempts. Please try again shortly.' } },
                        { status: 429 }
                    );
                }
                const result = await signInWithPassword(body.email || '', body.password || '');
                if ('error' in result) {
                    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
                }
                return NextResponse.json(result);
            }

            case 'signup': {
                const limit = checkRateLimit(`auth-signup:${clientIp(request)}`, { maxRequests: 5, windowSeconds: 60 });
                if (!limit.success) {
                    return NextResponse.json(
                        { error: { message: 'Too many attempts. Please try again shortly.' } },
                        { status: 429 }
                    );
                }
                const result = await signUp(body.email || '', body.password || '', body.data || {});
                if ('error' in result) {
                    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
                }
                return NextResponse.json(result);
            }

            case 'logout': {
                // Sessions are stateless JWTs; the client discards its copy.
                return NextResponse.json({ success: true });
            }

            case 'user': {
                const token = bearerToken(request);
                if (!token) {
                    return NextResponse.json({ error: { message: 'Missing token' } }, { status: 401 });
                }
                const result = await updateUser(token, {
                    password: body.password,
                    email: body.email,
                    data: body.data,
                });
                if ('error' in result) {
                    return NextResponse.json({ error: { message: result.error } }, { status: 400 });
                }
                return NextResponse.json(result);
            }

            case 'recover': {
                const limit = checkRateLimit(`auth-recover:${clientIp(request)}`, { maxRequests: 5, windowSeconds: 60 });
                if (!limit.success) {
                    return NextResponse.json(
                        { error: { message: 'Too many attempts. Please try again shortly.' } },
                        { status: 429 }
                    );
                }
                await sendRecoveryEmail(body.email || '', body.redirectTo || '');
                // Always succeed so account existence is never leaked.
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
        }
    } catch (err: any) {
        console.error(`[auth/${action}] error:`, err);
        return NextResponse.json(
            { error: { message: 'Authentication service error' } },
            { status: 500 }
        );
    }
}

async function sendRecoveryEmail(email: string, redirectTo: string): Promise<void> {
    if (!email) return;

    const res = await pool.query(
        `SELECT u.id, u.email, p.role FROM public.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE lower(u.email) = lower($1)`,
        [email]
    );
    if (!res.rows.length) return;

    const user = res.rows[0];
    const token = await signToken(
        { sub: user.id, email: user.email, role: user.role || 'customer', type: 'recovery' },
        RECOVERY_TOKEN_TTL_SECONDS
    );

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const base = redirectTo && redirectTo.startsWith(appUrl) ? redirectTo : `${appUrl}/auth/reset-password`;
    const link = `${base}#access_token=${token}&type=recovery`;

    const resend = new Resend(process.env.RESEND_API_KEY || 'missing_api_key');
    const from = process.env.EMAIL_FROM || 'NAD4U <noreply@nad4uhub.com>';

    await resend.emails.send({
        from,
        to: email,
        subject: 'Reset your NAD4U password',
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f3f4f6;padding:24px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#000000;padding:28px 40px;text-align:center;">
<h1 style="margin:0;color:#C5A059;font-size:22px;letter-spacing:0.15em;">NAD4U</h1></td></tr>
<tr><td style="padding:36px 40px;">
<h2 style="margin:0 0 12px;color:#111827;font-size:18px;">Reset your password</h2>
<p style="color:#4b5563;font-size:14px;line-height:1.6;">We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in 1 hour.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr>
<td style="background:#C5A059;border-radius:8px;"><a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:600;text-decoration:none;">Reset Password</a></td>
</tr></table>
<p style="color:#9ca3af;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
</td></tr></table></body></html>`,
    });
}
