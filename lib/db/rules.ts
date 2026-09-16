import type { QueryDescriptor } from './types';
import type { RowConstraint } from './engine';

/**
 * Authorization rules for queries arriving from the browser (/api/db).
 * These mirror the row-level security policies the store was designed with:
 *
 *  - anon:   public storefront reads, guest checkout writes
 *  - user:   everything anon can do, plus own-row access (uid-scoped)
 *  - staff:  full access (admin & staff roles)
 *
 * Server-side code (API routes, payment webhooks) uses the service-role
 * shim which bypasses these rules entirely — same model as before.
 */

export type CallerRole = 'anon' | 'user' | 'staff';

type Action = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

interface TableRule {
    /** actions allowed per role; staff is implicitly allowed everything */
    anon?: Action[];
    user?: Action[];
    /** extra WHERE constraint applied to non-staff SELECTs */
    readConstraint?: string;
    /** extra WHERE constraint applied to non-staff UPDATE/DELETE */
    writeConstraint?: string;
    /** validate/adjust insert rows for non-staff callers; throw to reject */
    checkInsert?: (row: any, userId: string | null) => void;
}

const OWN_ROW = '{t}.user_id = $UID';
const OWN_OR_GUEST_ORDER =
    'EXISTS (SELECT 1 FROM orders _o WHERE _o.id = {t}.order_id AND (_o.user_id IS NULL OR _o.user_id = $UID))';

const RULES: Record<string, TableRule> = {
    profiles: {
        user: ['select', 'update'],
        readConstraint: '{t}.id = $UID',
        writeConstraint: '{t}.id = $UID',
    },
    addresses: {
        user: ['select', 'insert', 'update', 'delete', 'upsert'],
        readConstraint: OWN_ROW,
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Addresses must belong to the signed-in user');
        },
    },
    categories: { anon: ['select'], user: ['select'] },
    products: {
        anon: ['select'],
        user: ['select'],
        readConstraint: "{t}.status = 'active'",
    },
    product_images: { anon: ['select'], user: ['select'] },
    product_variants: { anon: ['select'], user: ['select'] },
    coupons: { anon: ['select'], user: ['select'] },
    orders: {
        anon: ['select', 'insert'],
        user: ['select', 'insert'],
        readConstraint: '({t}.user_id IS NULL OR {t}.user_id = $UID)',
        checkInsert: (row, uid) => {
            const target = row.user_id ?? null;
            if (uid ? target !== null && target !== uid : target !== null) {
                throw new Error('Order user_id must match the caller');
            }
        },
    },
    order_items: {
        anon: ['select', 'insert'],
        user: ['select', 'insert'],
        readConstraint: OWN_OR_GUEST_ORDER,
    },
    order_status_history: {
        user: ['select'],
        readConstraint: 'EXISTS (SELECT 1 FROM orders _o WHERE _o.id = {t}.order_id AND _o.user_id = $UID)',
    },
    cart_items: {
        user: ['select', 'insert', 'update', 'delete', 'upsert'],
        readConstraint: OWN_ROW,
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Cart items must belong to the signed-in user');
        },
    },
    wishlist_items: {
        user: ['select', 'insert', 'delete', 'upsert'],
        readConstraint: OWN_ROW,
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Wishlist items must belong to the signed-in user');
        },
    },
    reviews: {
        anon: ['select'],
        user: ['select', 'insert', 'update'],
        readConstraint: "({t}.status = 'approved' OR {t}.user_id = $UID)",
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Reviews must belong to the signed-in user');
        },
    },
    review_images: {
        anon: ['select'],
        user: ['select'],
        readConstraint:
            "EXISTS (SELECT 1 FROM reviews _r WHERE _r.id = {t}.review_id AND (_r.status = 'approved' OR _r.user_id = $UID))",
    },
    blog_posts: {
        anon: ['select'],
        user: ['select'],
        readConstraint: "{t}.status = 'published'",
    },
    support_tickets: {
        user: ['select', 'insert', 'update'],
        readConstraint: OWN_ROW,
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Tickets must belong to the signed-in user');
        },
    },
    support_messages: {
        user: ['select', 'insert'],
        readConstraint:
            'EXISTS (SELECT 1 FROM support_tickets _t WHERE _t.id = {t}.ticket_id AND _t.user_id = $UID)',
    },
    return_requests: {
        user: ['select', 'insert'],
        readConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Returns must belong to the signed-in user');
        },
    },
    return_items: {
        user: ['select'],
        readConstraint:
            'EXISTS (SELECT 1 FROM return_requests _r WHERE _r.id = {t}.return_request_id AND _r.user_id = $UID)',
    },
    notifications: {
        user: ['select', 'insert', 'update', 'delete'],
        readConstraint: OWN_ROW,
        writeConstraint: OWN_ROW,
        checkInsert: (row, uid) => {
            if (!uid || row.user_id !== uid) throw new Error('Notifications must belong to the signed-in user');
        },
    },
    pages: { anon: ['select'], user: ['select'] },
    site_settings: { anon: ['select'], user: ['select'] },
    cms_content: {
        anon: ['select'],
        user: ['select'],
        readConstraint: '{t}.is_active = true',
    },
    banners: {
        anon: ['select'],
        user: ['select'],
        readConstraint: '{t}.is_active = true',
    },
    navigation_menus: { anon: ['select'], user: ['select'] },
    navigation_items: {
        anon: ['select'],
        user: ['select'],
        readConstraint: '{t}.is_active = true',
    },
    store_modules: { anon: ['select'], user: ['select'] },
    store_settings: { anon: ['select'], user: ['select'] },
    contact_submissions: {
        anon: ['insert'],
        user: ['insert'],
    },
    // staff-only tables: customers, audit_logs, storage_objects, users
};

/** Stored functions callable from the browser, per role. */
const RPC_RULES: Record<string, CallerRole[]> = {
    upsert_customer_from_order: ['anon', 'user', 'staff'],
    mark_order_paid: ['staff'],
    get_all_customer_emails: ['staff'],
    get_all_customer_phones: ['staff'],
    reduce_stock_on_order: ['staff'],
    update_customer_stats: ['staff'],
};

export interface AuthorizedPlan {
    constraints: RowConstraint[];
}

export function authorizeQuery(
    q: QueryDescriptor,
    role: CallerRole,
    userId: string | null
): AuthorizedPlan {
    if (role === 'staff') return { constraints: [] };

    const rule = RULES[q.table];
    if (!rule) throw new Error(`Access to table "${q.table}" is not allowed`);

    const allowed = (role === 'user' ? rule.user : rule.anon) || [];
    if (!allowed.includes(q.action)) {
        throw new Error(`"${q.action}" on "${q.table}" is not allowed`);
    }

    if ((q.action === 'insert' || q.action === 'upsert') && rule.checkInsert) {
        const rows = Array.isArray(q.values) ? q.values : [q.values];
        for (const row of rows) rule.checkInsert(row || {}, userId);
    }

    const constraints: RowConstraint[] = [];
    if (q.action === 'select' && rule.readConstraint) {
        constraints.push({ sql: rule.readConstraint });
    }
    if ((q.action === 'update' || q.action === 'delete') && rule.writeConstraint) {
        constraints.push({ sql: rule.writeConstraint });
    }
    return { constraints };
}

export function authorizeRpc(fn: string, role: CallerRole): void {
    const allowed = RPC_RULES[fn];
    if (!allowed || !allowed.includes(role)) {
        throw new Error(`Function "${fn}" is not callable`);
    }
}
