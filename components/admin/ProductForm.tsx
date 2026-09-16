'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface ProductFormProps {
    initialData?: any;
    isEditMode?: boolean;
}

export default function ProductForm({ initialData, isEditMode = false }: ProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    const [productName, setProductName] = useState(initialData?.name || '');
    const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
    const [price, setPrice] = useState(initialData?.price || '');
    const [salePrice, setSalePrice] = useState(
        initialData?.sale_price != null && initialData?.sale_price !== ''
            ? String(initialData.sale_price)
            : ''
    );
    const [comparePrice, setComparePrice] = useState(initialData?.compare_at_price || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [stock, setStock] = useState(initialData?.quantity || '');
    const [moq, setMoq] = useState(initialData?.moq || '1');
    const [lowStockThreshold, setLowStockThreshold] = useState(initialData?.metadata?.low_stock_threshold || '5');
    const [description, setDescription] = useState(initialData?.description || '');
    const [status, setStatus] = useState(initialData?.status || 'Active');
    const [featured, setFeatured] = useState(initialData?.featured || false);
    const [preorderShipping, setPreorderShipping] = useState(initialData?.metadata?.preorder_shipping || '');
    const [activeTab, setActiveTab] = useState('general');

    // Auto-generate SKU function
    const generateSku = () => {
        const prefix = 'HB';
        const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    };

    // ── Wig / hair option groups ─────────────
    type OptionGroupDef = {
        key: string;
        label: string;
        type: 'values' | 'color';
        defaultValues: string[];
        generatesVariants: boolean;
        help?: string;
        icon: string;
        accent: 'rose' | 'amber' | 'sky' | 'violet' | 'emerald' | 'indigo';
        presets?: { label: string; values: string[] }[];
    };

    const DEFAULT_OPTION_GROUPS: OptionGroupDef[] = [
        {
            key: 'color',
            label: 'Hair colour',
            type: 'color',
            defaultValues: [],
            generatesVariants: false,
            help: 'Swatches on the product page use this option. Naming convention: 1B, 4, 27, 613, etc.',
            icon: 'ri-palette-line',
            accent: 'rose',
            presets: [
                { label: 'Naturals (1, 1B, 2, 4)', values: ['1|#0a0a0a', '1B|#1a1a1a', '2|#2c1810', '4|#4a2a17'] },
                { label: 'Blondes (22, 27, 30, 613)', values: ['22|#c7a577', '27|#a67c52', '30|#6e4b2c', '613|#f0d99b'] },
                { label: 'Reds & Burgundy', values: ['33|#7a2e1d', '99J|#562020', 'Burgundy|#56122a'] },
            ],
        },
        {
            key: 'lace_type',
            label: 'Lace type',
            type: 'values',
            defaultValues: ['HD Lace', 'Transparent Lace'],
            generatesVariants: false,
            help: 'Turn on “Creates variants” only if HD vs transparent should have different prices.',
            icon: 'ri-shape-line',
            accent: 'amber',
        },
        {
            key: 'lace_length',
            label: 'Lace size (closure / frontal)',
            type: 'values',
            defaultValues: ['2x6', '4x4', '5x5', '6x6', '7x7', '13x4', '13x6'],
            generatesVariants: false,
            icon: 'ri-aspect-ratio-line',
            accent: 'sky',
            presets: [
                { label: 'Closures only (2x6, 4x4, 5x5)', values: ['2x6', '4x4', '5x5'] },
                { label: 'Frontals only (13x4, 13x6)', values: ['13x4', '13x6'] },
                { label: 'Full set', values: ['2x6', '4x4', '5x5', '6x6', '7x7', '13x4', '13x6'] },
            ],
        },
        {
            key: 'length',
            label: 'Hair length',
            type: 'values',
            defaultValues: ['10\"', '12\"', '14\"', '16\"', '18\"', '20\"', '22\"', '24\"', '26\"', '28\"', '30\"'],
            generatesVariants: true,
            help: 'Most wigs price differently by inch. Use the pricing curve below to auto-fill prices.',
            icon: 'ri-ruler-line',
            accent: 'violet',
            presets: [
                { label: 'Short (10–14")', values: ['10\"', '12\"', '14\"'] },
                { label: 'Medium (16–22")', values: ['16\"', '18\"', '20\"', '22\"'] },
                { label: 'Long (24–30")', values: ['24\"', '26\"', '28\"', '30\"'] },
                { label: 'All (10–30")', values: ['10\"', '12\"', '14\"', '16\"', '18\"', '20\"', '22\"', '24\"', '26\"', '28\"', '30\"'] },
            ],
        },
        {
            key: 'wig_size',
            label: 'Wig cap size',
            type: 'values',
            defaultValues: ['Small', 'Medium', 'Large', 'Extra Large'],
            generatesVariants: false,
            icon: 'ri-user-smile-line',
            accent: 'emerald',
        },
        {
            key: 'density',
            label: 'Density',
            type: 'values',
            defaultValues: ['150%', '180%', '200%', '250%', '300%', '350%'],
            generatesVariants: false,
            icon: 'ri-stack-line',
            accent: 'indigo',
            presets: [
                { label: 'Light (150–200%)', values: ['150%', '180%', '200%'] },
                { label: 'Standard (250–300%)', values: ['250%', '300%'] },
                { label: 'Full range', values: ['150%', '180%', '200%', '250%', '300%', '350%'] },
            ],
        },
    ];

    const ACCENT_STYLES: Record<OptionGroupDef['accent'], { iconBg: string; iconText: string; border: string }> = {
        rose: { iconBg: 'bg-rose-50', iconText: 'text-rose-600', border: 'border-rose-200' },
        amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', border: 'border-amber-200' },
        sky: { iconBg: 'bg-sky-50', iconText: 'text-sky-600', border: 'border-sky-200' },
        violet: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', border: 'border-violet-200' },
        emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', border: 'border-emerald-200' },
        indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-600', border: 'border-indigo-200' },
    };

    type OptionGroupState = {
        enabled: boolean;
        values: string[];
        generatesVariants: boolean;
    };

    const legacyVariants = (initialData?.product_variants || []) as any[];

    const [optionGroupStates, setOptionGroupStates] = useState<Record<string, OptionGroupState>>(() => {
        const stored = initialData?.metadata?.product_options as
            | Record<string, { values: string[]; generatesVariants?: boolean }>
            | undefined;
        const state: Record<string, OptionGroupState> = {};
        if (stored && Object.keys(stored).length > 0) {
            DEFAULT_OPTION_GROUPS.forEach((def) => {
                if (stored[def.key]) {
                    state[def.key] = {
                        enabled: true,
                        values: stored[def.key].values || def.defaultValues,
                        generatesVariants: stored[def.key].generatesVariants ?? def.generatesVariants,
                    };
                } else {
                    state[def.key] = {
                        enabled: false,
                        values: def.defaultValues,
                        generatesVariants: def.generatesVariants,
                    };
                }
            });
            return state;
        }
        // Legacy: colour (option2) × length/size (option1 / name)
        if (legacyVariants.length > 0) {
            const colors = [...new Set(legacyVariants.map((v) => v.option2).filter(Boolean))] as string[];
            const lengths = [...new Set(legacyVariants.map((v) => v.option1 || v.name).filter(Boolean))] as string[];
            DEFAULT_OPTION_GROUPS.forEach((def) => {
                state[def.key] = {
                    enabled: false,
                    values: def.defaultValues,
                    generatesVariants: def.generatesVariants,
                };
            });
            if (colors.length > 0) {
                state.color = {
                    enabled: true,
                    values: colors.map((c) => {
                        const row = legacyVariants.find((v) => v.option2 === c);
                        const hex = row?.metadata?.color_hex || '#888888';
                        return `${c}|${hex}`;
                    }),
                    generatesVariants: true,
                };
            }
            if (lengths.length > 0) {
                state.length = {
                    enabled: true,
                    values: lengths,
                    generatesVariants: true,
                };
            }
            return state;
        }
        DEFAULT_OPTION_GROUPS.forEach((def) => {
            state[def.key] = {
                enabled: false,
                values: def.defaultValues,
                generatesVariants: def.generatesVariants,
            };
        });
        return state;
    });

    const [customGroups, setCustomGroups] = useState<
        { name: string; values: string[]; generatesVariants: boolean }[]
    >(() => {
        const storedCustom = initialData?.metadata?.custom_option_groups as
            | { name: string; values: string[]; generatesVariants?: boolean }[]
            | undefined;
        return (storedCustom || []).map((g) => ({
            name: g.name,
            values: g.values || [],
            generatesVariants: g.generatesVariants ?? false,
        }));
    });
    const [customGroupInput, setCustomGroupInput] = useState('');

    const [colorPickerHex, setColorPickerHex] = useState('#1a1a1a');
    const [colorPickerName, setColorPickerName] = useState('');
    const [customOptionInput, setCustomOptionInput] = useState<Record<string, string>>({});

    const toggleOptionGroup = (key: string) => {
        setOptionGroupStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled },
        }));
    };

    const toggleGeneratesVariants = (key: string) => {
        setOptionGroupStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], generatesVariants: !prev[key].generatesVariants },
        }));
    };

    const addValueToGroup = (key: string, value: string) => {
        if (!value.trim()) return;
        setOptionGroupStates((prev) => {
            const g = prev[key];
            if (g.values.includes(value.trim())) return prev;
            return { ...prev, [key]: { ...g, values: [...g.values, value.trim()] } };
        });
        setCustomOptionInput((prev) => ({ ...prev, [key]: '' }));
    };

    const removeValueFromGroup = (key: string, value: string) => {
        setOptionGroupStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], values: prev[key].values.filter((v) => v !== value) },
        }));
    };

    const addColorValue = () => {
        const label = colorPickerName.trim() || colorPickerHex;
        const colorVal = `${label}|${colorPickerHex}`;
        setOptionGroupStates((prev) => {
            const g = prev.color;
            if (g.values.some((v) => v.split('|')[1] === colorPickerHex)) return prev;
            return { ...prev, color: { ...g, values: [...g.values, colorVal] } };
        });
        setColorPickerName('');
    };

    const resetGroupToDefaults = (key: string) => {
        const def = DEFAULT_OPTION_GROUPS.find((d) => d.key === key);
        if (!def) return;
        setOptionGroupStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], values: def.defaultValues },
        }));
    };

    const addCustomGroup = () => {
        const name = customGroupInput.trim();
        if (!name || customGroups.some((g) => g.name === name)) return;
        setCustomGroups((prev) => [...prev, { name, values: [], generatesVariants: false }]);
        setCustomGroupInput('');
    };
    const removeCustomGroup = (idx: number) => setCustomGroups((prev) => prev.filter((_, i) => i !== idx));
    const addCustomGroupValue = (idx: number, val: string) => {
        if (!val.trim()) return;
        setCustomGroups((prev) =>
            prev.map((g, i) =>
                i === idx && !g.values.includes(val.trim()) ? { ...g, values: [...g.values, val.trim()] } : g
            )
        );
        setCustomOptionInput((prev) => ({ ...prev, [`custom_${idx}`]: '' }));
    };
    const removeCustomGroupValue = (idx: number, val: string) => {
        setCustomGroups((prev) =>
            prev.map((g, i) => (i === idx ? { ...g, values: g.values.filter((v) => v !== val) } : g))
        );
    };

    const enabledDefaults = DEFAULT_OPTION_GROUPS.filter(
        (d) => optionGroupStates[d.key]?.enabled && optionGroupStates[d.key]?.values.length > 0
    );

    type GenGroup = { name: string; values: string[]; key: string };

    const variantGeneratingGroups: GenGroup[] = [
        ...enabledDefaults
            .filter((d) => optionGroupStates[d.key].generatesVariants)
            .map((d) => ({
                name: d.label,
                key: d.key,
                values:
                    d.key === 'color'
                        ? optionGroupStates[d.key].values.map((v) => v.split('|')[0])
                        : optionGroupStates[d.key].values,
            })),
        ...customGroups
            .filter((g) => g.generatesVariants && g.values.length > 0)
            .map((g, i) => ({ name: g.name, values: g.values, key: `custom_${i}` })),
    ];

    const activeGroups = variantGeneratingGroups;

    const cartesian = (arrays: string[][]): string[][] => {
        if (arrays.length === 0) return [[]];
        const [first, ...rest] = arrays;
        const restProduct = cartesian(rest);
        return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
    };

    const internalValueArrays = (): string[][] =>
        activeGroups.map((g) => {
            const def = DEFAULT_OPTION_GROUPS.find((d) => d.key === g.key);
            if (def?.key === 'color') {
                return optionGroupStates.color.values.filter((raw) =>
                    g.values.includes(raw.split('|')[0])
                );
            }
            return g.values;
        });

    const variantCombinations =
        activeGroups.length > 0
            ? cartesian(internalValueArrays()).map((values) => ({
                  values: values.map((raw) => (raw.includes('|') ? raw.split('|')[0] : raw)),
                  key: values.join('|||'),
                  rawValues: values,
              }))
            : [];

    type VariantRow = {
        price: string;
        comparePrice: string;
        salePrice: string;
        stock: string;
        sku: string;
        imageUrl: string;
    };

    const emptyVariantRow = (): VariantRow => ({
        price: price?.toString() || '',
        comparePrice: comparePrice?.toString() || '',
        salePrice: salePrice?.toString() || '',
        stock: '0',
        sku: '',
        imageUrl: '',
    });

    const [variantData, setVariantData] = useState<Record<string, VariantRow>>(() => {
        const data: Record<string, VariantRow> = {};
        const byLegacyKey = (v: any) => {
            const c = v.option2 || '';
            const len = v.option1 || '';
            const hex = v.metadata?.color_hex;
            const colorPart = c && hex ? `${c}|${hex}` : c;
            return [colorPart, len].filter(Boolean).join('|||');
        };

        legacyVariants.forEach((v: any) => {
            let key = typeof v.metadata?.combo_key === 'string' ? v.metadata.combo_key : '';
            if (!key) {
                key = byLegacyKey(v);
            }
            if (!key) {
                key = (v.name || v.id || 'default') as string;
            }
            data[key] = {
                price: v.price?.toString() || '',
                comparePrice: v.compare_at_price != null ? String(v.compare_at_price) : '',
                salePrice:
                    v.sale_price != null && v.sale_price !== '' ? String(v.sale_price) : '',
                stock: (v.stock ?? v.quantity ?? 0).toString(),
                sku: v.sku || '',
                imageUrl: v.image_url || '',
            };
        });
        return data;
    });

    // Apply a preset value list to an option group (replaces current values).
    const applyPreset = (key: string, values: string[]) => {
        setOptionGroupStates((prev) => ({
            ...prev,
            [key]: { ...prev[key], enabled: true, values: [...values] },
        }));
    };

    // Pricing curve state (only relevant when Length is variant-driving)
    const [curveBase, setCurveBase] = useState('');
    const [curveStep, setCurveStep] = useState('');

    const applyLengthPricingCurve = () => {
        const baseNum = parseFloat(curveBase);
        const stepNum = parseFloat(curveStep);
        if (!Number.isFinite(baseNum) || baseNum <= 0) {
            alert('Enter a valid base price for the shortest length.');
            return;
        }
        if (!Number.isFinite(stepNum)) {
            alert('Enter a valid step amount (use 0 for flat pricing).');
            return;
        }
        const lengthIdx = activeGroups.findIndex((g) => g.key === 'length');
        if (lengthIdx < 0) {
            alert('Enable the Length option as variant-driving first.');
            return;
        }
        // Sort length values by numeric component so prices increase with size
        const lengthValues = [...activeGroups[lengthIdx].values];
        const sortLengths = lengthValues
            .map((v) => ({ v, n: parseFloat(v.replace(/[^\d.]/g, '')) || 0 }))
            .sort((a, b) => a.n - b.n)
            .map((x) => x.v);
        const priceByLength: Record<string, number> = {};
        sortLengths.forEach((v, i) => {
            priceByLength[v] = +(baseNum + stepNum * i).toFixed(2);
        });
        setVariantData((prev) => {
            const updated = { ...prev };
            variantCombinations.forEach((combo) => {
                const lengthVal = combo.values[lengthIdx];
                const newPrice = priceByLength[lengthVal];
                if (newPrice != null) {
                    updated[combo.key] = {
                        ...(updated[combo.key] || emptyVariantRow()),
                        price: String(newPrice),
                    };
                }
            });
            return updated;
        });
    };

    const slugifyValue = (s: string) =>
        s
            .toString()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '')
            .slice(0, 8) || 'X';

    const autoFillVariantSkus = () => {
        let parent = sku?.trim();
        if (!parent) {
            parent = generateSku();
            setSku(parent);
        }
        const cleanParent = parent.replace(/-+$/, '');
        setVariantData((prev) => {
            const updated = { ...prev };
            variantCombinations.forEach((combo) => {
                const suffix = combo.values.map(slugifyValue).join('-');
                updated[combo.key] = {
                    ...(updated[combo.key] || emptyVariantRow()),
                    sku: `${cleanParent}-${suffix}`,
                };
            });
            return updated;
        });
    };

    const setVariantImage = (key: string, url: string) => {
        setVariantData((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || emptyVariantRow()), imageUrl: url },
        }));
    };

    // Bulk-by-axis: apply a value to every variant where `groupKey` equals `axisValue`
    const bulkSetByAxis = (
        groupIdx: number,
        axisValue: string,
        field: 'price' | 'stock' | 'comparePrice' | 'salePrice',
        newValue: string,
    ) => {
        if (groupIdx < 0) return;
        setVariantData((prev) => {
            const updated = { ...prev };
            variantCombinations.forEach((combo) => {
                if (combo.values[groupIdx] === axisValue) {
                    updated[combo.key] = {
                        ...(updated[combo.key] || emptyVariantRow()),
                        [field]: newValue,
                    };
                }
            });
            return updated;
        });
    };

    const FIELD_LABELS: Record<'price' | 'comparePrice' | 'salePrice' | 'stock', string> = {
        price: 'regular price (GH₵)',
        comparePrice: 'compare-at price (GH₵)',
        salePrice: 'sale price (GH₵)',
        stock: 'stock qty',
    };

    const promptBulkByAxis = (groupIdx: number, groupLabel: string, axisValue: string) => {
        const fieldChoice = prompt(
            `Apply to every variant where ${groupLabel} = "${axisValue}":\n\nWhich field?\n  1) Regular price\n  2) Compare-at (was) price\n  3) Sale price\n  4) Stock\n\nEnter 1, 2, 3 or 4:`,
            '1',
        );
        if (!fieldChoice) return;
        const map: Record<string, 'price' | 'comparePrice' | 'salePrice' | 'stock'> = {
            '1': 'price',
            '2': 'comparePrice',
            '3': 'salePrice',
            '4': 'stock',
        };
        const field = map[fieldChoice.trim()];
        if (!field) return;
        const val = prompt(`New ${FIELD_LABELS[field]} for ${groupLabel} = "${axisValue}":`, '');
        if (val == null) return;
        bulkSetByAxis(groupIdx, axisValue, field, val);
    };

    const variants = variantCombinations.map((combo) => {
        const d = variantData[combo.key] || emptyVariantRow();
        const keys = activeGroups.map((g) => g.key);
        const colorIdx = keys.indexOf('color');
        const displayVals = combo.rawValues.map((raw) => (raw.includes('|') ? raw.split('|')[0] : raw));
        const rest = displayVals.filter((_, i) => i !== colorIdx);
        const variantName =
            rest.length > 0 ? rest.join(' / ') : displayVals.join(' / ') || 'Default';
        return {
            key: combo.key,
            values: combo.rawValues,
            groupKeys: keys,
            displayVals,
            variantName: variantName || displayVals.join(' / ') || 'Default',
            sku: d.sku,
            price: d.price || price?.toString() || '',
            comparePrice: d.comparePrice || '',
            salePrice: d.salePrice || '',
            stock: d.stock || '0',
            imageUrl: d.imageUrl || '',
        };
    });

    const updateVariantField = (key: string, field: string, value: string) => {
        setVariantData((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || emptyVariantRow()),
                [field]: value,
            },
        }));
    };

    const bulkSetField = (
        field: 'price' | 'stock' | 'comparePrice' | 'salePrice',
        value: string
    ) => {
        setVariantData((prev) => {
            const updated = { ...prev };
            variantCombinations.forEach((combo) => {
                updated[combo.key] = {
                    ...(updated[combo.key] || emptyVariantRow()),
                    [field]: value,
                };
            });
            return updated;
        });
    };

    // Images / videos
    const [images, setImages] = useState<any[]>(initialData?.product_images || []);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imagePickerOpenFor, setImagePickerOpenFor] = useState<string | null>(null);

    // SEO
    const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || '');
    const [metaDescription, setMetaDescription] = useState(initialData?.seo_description || '');
    const [urlSlug, setUrlSlug] = useState(initialData?.slug || '');
    const [keywords, setKeywords] = useState(initialData?.tags?.join(', ') || '');

    const tabs = [
        { id: 'general', label: 'General', icon: 'ri-information-line' },
        { id: 'pricing', label: 'Pricing & Inventory', icon: 'ri-price-tag-3-line' },
        { id: 'variants', label: 'Variants', icon: 'ri-layout-grid-line' },
        { id: 'images', label: 'Images', icon: 'ri-image-line' },
        { id: 'seo', label: 'SEO', icon: 'ri-search-line' }
    ];

    // Fetch categories on mount
    useEffect(() => {
        async function fetchCategories() {
            const { data } = await supabase.from('categories').select('id, name').eq('status', 'active');
            if (data) {
                setCategories(data);
                if (data.length > 0 && !categoryId) {
                    setCategoryId(data[0].id);
                }
            }
        }
        fetchCategories();
    }, [categoryId]);

    // Auto-generate slug from name if not manually edited
    useEffect(() => {
        if (!isEditMode && productName && !urlSlug) {
            setUrlSlug(productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    }, [productName, isEditMode, urlSlug]);

    // Auto-generate SKU for new products
    useEffect(() => {
        if (!isEditMode && !sku) {
            setSku(generateSku());
        }
    }, [isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const MAX_MEDIA = 10;
    const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
    const VIDEO_MIME_TYPES = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-m4v',
        'video/mpeg',
    ];
    const isVideoFile = (urlOrName: string) =>
        /\.(mp4|webm|ogg|mov|avi|m4v|mpeg|mpg)$/i.test(urlOrName);

    const guessContentType = (file: File): string => {
        if (file.type && file.type !== 'application/octet-stream') return file.type;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const map: Record<string, string> = {
            mp4: 'video/mp4',
            webm: 'video/webm',
            ogg: 'video/ogg',
            mov: 'video/quicktime',
            avi: 'video/x-msvideo',
            m4v: 'video/x-m4v',
            mpeg: 'video/mpeg',
            mpg: 'video/mpeg',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
        };
        return map[ext] || 'application/octet-stream';
    };

    const uploadFileWithProgress = (file: File, signedUrl: string, contentType: string) =>
        new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', signedUrl);
            xhr.setRequestHeader('Content-Type', contentType);
            xhr.upload.onprogress = (evt) => {
                if (!evt.lengthComputable) return;
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(pct);
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 180) || 'unknown error'}`));
            };
            xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and try again.'));
            xhr.onabort = () => reject(new Error('Upload cancelled.'));
            xhr.send(file);
        });

    const uploadOneMediaFile = async (file: File) => {
        if (file.size > MAX_MEDIA_BYTES) {
            throw new Error(
                `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Max is 50 MB — compress to a short 720p MP4 and retry.`
            );
        }

        const contentType = guessContentType(file);
        const looksVideo = VIDEO_MIME_TYPES.includes(contentType) || isVideoFile(file.name);
        const looksImage = contentType.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
        if (!looksVideo && !looksImage) {
            throw new Error(`"${file.name}" is not a supported image or video.`);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error('Your admin session expired. Please log in again and retry the upload.');
        }

        const initRes = await fetch('/api/admin/media/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                filename: file.name,
                contentType,
                size: file.size,
            }),
        });
        const initJson = await initRes.json();
        if (!initRes.ok || !initJson.success || !initJson.data?.signedUrl) {
            throw new Error(initJson.error || 'Could not start upload');
        }

        const { signedUrl, publicUrl, isVideo, token, path } = initJson.data;

        // Prefer XHR PUT against the signed URL so we can show real upload progress
        // on large videos. Fall back to the SDK helper if the PUT fails.
        try {
            await uploadFileWithProgress(file, signedUrl, contentType);
        } catch (primaryErr: any) {
            if (token && path) {
                setUploadProgress(10);
                const { error: putError } = await supabase.storage
                    .from('products')
                    .uploadToSignedUrl(path, token, file, { contentType, upsert: false });
                if (putError) throw putError;
                setUploadProgress(100);
            } else {
                throw primaryErr;
            }
        }

        return {
            url: publicUrl as string,
            is_video: Boolean(isVideo || looksVideo),
        };
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const fileList = input.files;
        if (!fileList || fileList.length === 0) return;

        const remaining = MAX_MEDIA - images.length;
        if (remaining <= 0) {
            alert(`You can add up to ${MAX_MEDIA} media items per product.`);
            input.value = '';
            return;
        }

        const files = Array.from(fileList).slice(0, remaining);
        setUploading(true);
        setUploadProgress(0);
        setUploadStatus('');

        try {
            const added: { url: string; position: number; is_video: boolean }[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadStatus(`Uploading ${i + 1}/${files.length}: ${file.name}`);
                setUploadProgress(0);
                const result = await uploadOneMediaFile(file);
                added.push({
                    url: result.url,
                    position: images.length + added.length,
                    is_video: result.is_video,
                });
            }
            setImages((prev) => [...prev, ...added]);
            setUploadStatus(added.length === 1 ? 'Uploaded' : `Uploaded ${added.length} files`);
        } catch (error: any) {
            console.error('Media upload failed:', error);
            alert(error?.message || 'Error uploading file');
            setUploadStatus('');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            input.value = '';
            // Clear status after a beat so the UI returns to idle
            setTimeout(() => setUploadStatus(''), 1800);
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages(images.filter((_, idx) => idx !== indexToRemove));
    };

    // Variant helpers: option groups + cartesian grid (wig / LuxuryStrand model)

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // If product has variants, auto-sync main stock = sum of variant stocks
            const hasVariants = variants.length > 0;
            const variantStockTotal = hasVariants
                ? variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
                : parseInt(stock) || 0;

            const salePriceNum = salePrice.trim() ? parseFloat(salePrice) : NaN;
            const productData = {
                name: productName,
                slug: urlSlug || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                description,
                category_id: categoryId || null,
                price: parseFloat(price) || 0,
                sale_price:
                    !Number.isNaN(salePriceNum) && salePriceNum > 0 ? salePriceNum : null,
                compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
                sku: sku || generateSku(), // Auto-generate if empty
                quantity: hasVariants ? variantStockTotal : (parseInt(stock) || 0),
                moq: parseInt(moq) || 1,
                status: status.toLowerCase(),
                featured,
                seo_title: seoTitle,
                seo_description: metaDescription,
                tags: (keywords as string).split(',').map((k: string) => k.trim()).filter(Boolean),
                metadata: {
                    ...(isEditMode && initialData?.metadata && typeof initialData.metadata === 'object'
                        ? { ...initialData.metadata }
                        : {}),
                    low_stock_threshold: parseInt(lowStockThreshold) || 5,
                    preorder_shipping: preorderShipping.trim() || null,
                    option_names: activeGroups.map((g) => g.name),
                    product_options: Object.fromEntries(
                        enabledDefaults.map((d) => [
                            d.key,
                            {
                                values: optionGroupStates[d.key].values,
                                generatesVariants: optionGroupStates[d.key].generatesVariants,
                            },
                        ])
                    ),
                    custom_option_groups: customGroups.filter((g) => g.values.length > 0),
                },
            };

            let productId = initialData?.id;
            let error;

            if (isEditMode && productId) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', productId);
                error = updateError;
            } else {
                // Create new
                const { data: newProduct, error: insertError } = await supabase
                    .from('products')
                    .insert([productData])
                    .select()
                    .single();

                if (newProduct) productId = newProduct.id;
                error = insertError;
            }

            if (error) throw error;

            // Update Images
            if (productId) {
                // Strategy: We will just delete all old images/variants and recreate them for simplicity in this MVP.
                // In a clearer implementation, we would diff them.

                // 1. Images
                if (isEditMode) {
                    await supabase.from('product_images').delete().eq('product_id', productId);
                }
                if (images.length > 0) {
                    const imageInserts = images.map((img, idx) => ({
                        product_id: productId,
                        url: img.url,
                        position: idx,
                        alt_text: productName
                    }));
                    await supabase.from('product_images').insert(imageInserts);
                }

                // 2. Variants
                if (isEditMode) {
                    // Be careful not to delete ALL variants if we want to preserve IDs etc, 
                    // but for now, full replacement is safer to ensure sync.
                    // Note: This might break order-item references if they rely on variant_id hard constraints without cascading.
                    // Our Schema migration has ON DELETE SET NULL for order_items -> variant_id, so this is safe for now (but distinct from "archiving").
                    await supabase.from('product_variants').delete().eq('product_id', productId);
                }

                if (variants.length > 0) {
                    const variantInserts = variants.map((v) => {
                        const displayVals = v.values.map((raw: string) =>
                            raw.includes('|') ? raw.split('|')[0] : raw
                        );
                        const colorIdx = v.groupKeys.indexOf('color');
                        const colorLabel = colorIdx >= 0 ? displayVals[colorIdx] : '';
                        const rest = displayVals.filter((_: string, i: number) => i !== colorIdx);
                        const name =
                            rest.length > 0 ? rest.join(' / ') : displayVals.join(' / ') || 'Default';
                        const option2 = colorLabel || null;
                        const option1 = rest[0] ?? null;
                        const option3 =
                            rest.length > 1 ? rest.slice(1).join(' / ') : null;
                        let colorHex: string | null = null;
                        if (colorIdx >= 0 && v.values[colorIdx]?.includes('|')) {
                            colorHex = v.values[colorIdx].split('|')[1] || null;
                        }
                        const vSale = v.salePrice?.trim() ? parseFloat(v.salePrice) : NaN;
                        const compareNum = v.comparePrice?.trim() ? parseFloat(v.comparePrice) : NaN;
                        return {
                            product_id: productId,
                            name,
                            sku: v.sku || null,
                            price: parseFloat(v.price) || 0,
                            compare_at_price:
                                !Number.isNaN(compareNum) && compareNum > 0 ? compareNum : null,
                            sale_price:
                                !Number.isNaN(vSale) && vSale > 0 ? vSale : null,
                            quantity: parseInt(v.stock) || 0,
                            option1,
                            option2,
                            option3,
                            image_url: v.imageUrl || null,
                            metadata: {
                                ...(colorHex ? { color_hex: colorHex } : {}),
                                combo_key: v.key,
                            },
                        };
                    });
                    const { error: varError } = await supabase.from('product_variants').insert(variantInserts);
                    if (varError) throw varError;
                }
            }

            alert(isEditMode ? 'Product updated successfully!' : 'Product created successfully!');
            router.push('/admin/products');

        } catch (err: any) {
            console.error('Error saving product:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/admin/products"
                        className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                    >
                        <i className="ri-arrow-left-line text-xl text-gray-700"></i>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isEditMode ? 'Edit Product' : 'Add New Product'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {isEditMode ? 'Update product information and settings' : 'Create a new product for your catalog'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {isEditMode && (
                        <Link
                            href={`/product/${initialData?.slug || initialData?.id}`}
                            target="_blank"
                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-semibold whitespace-nowrap cursor-pointer flex items-center"
                        >
                            <i className="ri-eye-line mr-2"></i>
                            Preview
                        </Link>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <i className="ri-loader-4-line animate-spin mr-2"></i>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="ri-save-line mr-2"></i>
                                {isEditMode ? 'Save Changes' : 'Create Product'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 overflow-x-auto">
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-4 font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${activeTab === tab.id
                                    ? 'border-slate-700 text-slate-700 bg-slate-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <i className={`${tab.icon} text-xl`}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8">
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                    placeholder="Enter product name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={6}
                                    maxLength={500}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
                                    placeholder="Describe your product..."
                                />
                                <p className="text-sm text-gray-500 mt-2">{description.length}/500 characters</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full px-4 py-3 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
                                    >
                                        {categories.length === 0 && <option value="">Loading categories...</option>}
                                        {categories.length > 0 && <option value="">Select a category</option>}
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-4 py-3 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
                                    >
                                        <option>Active</option>
                                        <option>Draft</option>
                                        <option>Archived</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={featured}
                                    onChange={(e) => setFeatured(e.target.checked)}
                                    className="w-5 h-5 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer"
                                />
                                <label className="text-gray-900 font-medium">
                                    Feature this product on homepage
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Pre-order / Estimated Shipping
                                </label>
                                <input
                                    type="text"
                                    value={preorderShipping}
                                    onChange={(e) => setPreorderShipping(e.target.value)}
                                    placeholder="e.g., Ships in 14 days, Available March 15"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty if product ships immediately. Otherwise, enter estimated shipping time.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Regular price (GH₵) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">GH₵</span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full pl-16 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Sale price (GH₵)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">GH₵</span>
                                        <input
                                            type="number"
                                            value={salePrice}
                                            onChange={(e) => setSalePrice(e.target.value)}
                                            className="w-full pl-16 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                            step="0.01"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Used only when <strong>Store-wide sale</strong> is ON in Admin → Sale pricing. Leave empty to keep regular price during sales.
                                    </p>
                                    <div className="mt-3">
                                        <Link
                                            href="/admin/sales"
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                                        >
                                            <i className="ri-price-tag-2-line"></i>
                                            Open Sale Pricing Toggle
                                        </Link>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Compare at Price (GH₵)
                                    </label>
                                    <div className="relative max-w-md">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">GH₵</span>
                                        <input
                                            type="number"
                                            value={comparePrice}
                                            onChange={(e) => setComparePrice(e.target.value)}
                                            className="w-full pl-16 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">Optional “was” price when not in site-wide sale mode</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-slate-900 font-semibold mb-1">Discount Calculation</p>
                                {price && comparePrice && parseFloat(comparePrice) > parseFloat(price) ? (
                                    <p className="text-slate-800">
                                        Savings: GH₵ {(parseFloat(comparePrice) - parseFloat(price)).toFixed(2)}
                                        <span className="ml-2">
                                            ({(((parseFloat(comparePrice) - parseFloat(price)) / parseFloat(comparePrice)) * 100).toFixed(0)}% off)
                                        </span>
                                    </p>
                                ) : (
                                    <p className="text-slate-800 text-sm">Enter a valid compare price higher than the price to see discount.</p>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Inventory</h3>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            SKU (Auto-generated)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={sku}
                                                onChange={(e) => setSku(e.target.value)}
                                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-mono bg-gray-50"
                                                placeholder="Auto-generated"
                                                readOnly
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setSku(generateSku())}
                                                className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                                                title="Generate new SKU"
                                            >
                                                <i className="ri-refresh-line text-lg"></i>
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">SKU is auto-generated. Click refresh to generate a new one.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Stock Quantity *
                                        </label>
                                        {variants.length > 0 ? (
                                            <div>
                                                <input
                                                    type="number"
                                                    value={variants.reduce((sum: number, v: any) => sum + (parseInt(v.stock) || 0), 0)}
                                                    readOnly
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                                />
                                                <p className="text-sm text-blue-600 mt-1 flex items-center">
                                                    <i className="ri-information-line mr-1"></i>
                                                    Stock is managed per variant. Edit stock in the Variants tab.
                                                </p>
                                            </div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={stock}
                                                onChange={(e) => setStock(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                                placeholder="0"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 mt-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Minimum Order Quantity (MOQ)
                                        </label>
                                        <input
                                            type="number"
                                            value={moq}
                                            onChange={(e) => setMoq(e.target.value)}
                                            min="1"
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                            placeholder="1"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">Minimum quantity customers must order</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                                            Low Stock Threshold
                                        </label>
                                        <input
                                            type="number"
                                            value={lowStockThreshold}
                                            onChange={(e) => setLowStockThreshold(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">Get notified when stock falls below this number</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'variants' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Wig options & variants</h3>
                                <p className="text-gray-600 mt-1">
                                    Turn on the options that apply (lace type, length, cap size, density, colour, etc.). Mark
                                    <span className="font-semibold text-slate-800"> Creates variants</span> when each combination
                                    should have its own price and stock — just like on LuxuryStrand.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {DEFAULT_OPTION_GROUPS.map((def) => {
                                    const state = optionGroupStates[def.key];
                                    if (!state) return null;
                                    const isColor = def.type === 'color';
                                    const accent = ACCENT_STYLES[def.accent];
                                    return (
                                        <div
                                            key={def.key}
                                            className={`rounded-xl border-2 transition-all ${
                                                state.enabled
                                                    ? `${accent.border} bg-white shadow-sm`
                                                    : 'border-gray-200 bg-gray-50 opacity-80'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between p-4 border-b border-gray-100 gap-2 flex-wrap">
                                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={state.enabled}
                                                        onChange={() => toggleOptionGroup(def.key)}
                                                        className="w-5 h-5 text-slate-700 border-gray-300 rounded cursor-pointer flex-shrink-0"
                                                    />
                                                    <span
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.iconBg} ${accent.iconText}`}
                                                    >
                                                        <i className={`${def.icon} text-lg`}></i>
                                                    </span>
                                                    <span className="font-bold text-gray-900 truncate">{def.label}</span>
                                                </label>
                                                {state.enabled && (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGeneratesVariants(def.key)}
                                                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                                                                state.generatesVariants
                                                                    ? 'bg-violet-50 border-violet-300 text-violet-700'
                                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                                            }`}
                                                            title="Selection only = shown on the product page but same price/stock. Variant = drives separate price & stock per combination."
                                                        >
                                                            {state.generatesVariants ? (
                                                                <>
                                                                    <i className="ri-flashlight-fill text-violet-600"></i>
                                                                    Variant
                                                                </>
                                                            ) : (
                                                                'Selection only'
                                                            )}
                                                        </button>
                                                        {!isColor && (
                                                            <button
                                                                type="button"
                                                                onClick={() => resetGroupToDefaults(def.key)}
                                                                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
                                                                title="Reset list to defaults"
                                                            >
                                                                <i className="ri-refresh-line"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {def.help && (
                                                <p className="px-4 pt-3 text-xs text-gray-500 leading-relaxed">{def.help}</p>
                                            )}
                                            {state.enabled && def.presets && def.presets.length > 0 && (
                                                <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                                                    {def.presets.map((preset) => (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            onClick={() => applyPreset(def.key, preset.values)}
                                                            className="text-xs px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                                            title="Replace current values with this preset"
                                                        >
                                                            <i className="ri-magic-line mr-1 text-slate-400"></i>
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {state.enabled && (
                                                <div className="p-4 space-y-3">
                                                    {state.values.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {state.values.map((val) => {
                                                                if (isColor) {
                                                                    const [name, hex] = val.split('|');
                                                                    return (
                                                                        <span
                                                                            key={val}
                                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-sm"
                                                                        >
                                                                            <span
                                                                                className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                                                                                style={{ backgroundColor: hex || '#000' }}
                                                                            />
                                                                            {name}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeValueFromGroup('color', val)}
                                                                                className="text-gray-400 hover:text-red-500"
                                                                            >
                                                                                <i className="ri-close-line text-sm"></i>
                                                                            </button>
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span
                                                                        key={val}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-sm"
                                                                    >
                                                                        {val}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeValueFromGroup(def.key, val)}
                                                                            className="text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <i className="ri-close-line text-sm"></i>
                                                                        </button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {isColor ? (
                                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                                            <input
                                                                type="color"
                                                                value={colorPickerHex}
                                                                onChange={(e) => setColorPickerHex(e.target.value)}
                                                                className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer p-0.5"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={colorPickerName}
                                                                onChange={(e) => setColorPickerName(e.target.value)}
                                                                placeholder="Colour name (e.g. 1B, 613, Highlighted)"
                                                                className="flex-1 min-w-[8rem] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                onKeyDown={(e) => e.key === 'Enter' && addColorValue()}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={addColorValue}
                                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
                                                            <input
                                                                type="text"
                                                                value={customOptionInput[def.key] || ''}
                                                                onChange={(e) =>
                                                                    setCustomOptionInput((prev) => ({
                                                                        ...prev,
                                                                        [def.key]: e.target.value,
                                                                    }))
                                                                }
                                                                placeholder={`Add ${def.label.toLowerCase()}…`}
                                                                className="flex-1 min-w-[8rem] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                onKeyDown={(e) =>
                                                                    e.key === 'Enter' &&
                                                                    addValueToGroup(def.key, customOptionInput[def.key] || '')
                                                                }
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    addValueToGroup(def.key, customOptionInput[def.key] || '')
                                                                }
                                                                disabled={!(customOptionInput[def.key] || '').trim()}
                                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900">Custom option groups</h4>
                                        <p className="text-sm text-gray-500">
                                            For add-ons that aren’t in the list above (e.g. parting style). You can still mark a
                                            group as variant-driving.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-4 flex-wrap">
                                    <input
                                        type="text"
                                        value={customGroupInput}
                                        onChange={(e) => setCustomGroupInput(e.target.value)}
                                        placeholder="Group name (e.g. Bleached knots)"
                                        className="flex-1 min-w-[10rem] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomGroup()}
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomGroup}
                                        disabled={!customGroupInput.trim()}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <i className="ri-add-line mr-1"></i> Add group
                                    </button>
                                </div>
                                {customGroups.map((g, idx) => (
                                    <div
                                        key={`${g.name}-${idx}`}
                                        className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-3"
                                    >
                                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                            <span className="font-semibold text-gray-900">{g.name}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setCustomGroups((prev) =>
                                                            prev.map((cg, i) =>
                                                                i === idx
                                                                    ? { ...cg, generatesVariants: !cg.generatesVariants }
                                                                    : cg
                                                            )
                                                        )
                                                    }
                                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                                                        g.generatesVariants
                                                            ? 'bg-violet-50 border-violet-300 text-violet-700'
                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                                    }`}
                                                    title="Selection only = shown on the product page but same price/stock. Variant = drives separate price & stock per combination."
                                                >
                                                    {g.generatesVariants ? (
                                                        <>
                                                            <i className="ri-flashlight-fill text-violet-600"></i>
                                                            Variant
                                                        </>
                                                    ) : (
                                                        'Selection only'
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomGroup(idx)}
                                                    className="text-gray-400 hover:text-red-500"
                                                >
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </div>
                                        {g.values.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {g.values.map((val) => (
                                                    <span
                                                        key={val}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium shadow-sm"
                                                    >
                                                        {val}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCustomGroupValue(idx, val)}
                                                            className="text-gray-400 hover:text-red-500"
                                                        >
                                                            <i className="ri-close-line text-sm"></i>
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <input
                                                type="text"
                                                value={customOptionInput[`custom_${idx}`] || ''}
                                                onChange={(e) =>
                                                    setCustomOptionInput((prev) => ({
                                                        ...prev,
                                                        [`custom_${idx}`]: e.target.value,
                                                    }))
                                                }
                                                placeholder={`Add ${g.name.toLowerCase()}…`}
                                                className="flex-1 min-w-[8rem] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                onKeyDown={(e) =>
                                                    e.key === 'Enter' &&
                                                    addCustomGroupValue(idx, customOptionInput[`custom_${idx}`] || '')
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addCustomGroupValue(idx, customOptionInput[`custom_${idx}`] || '')
                                                }
                                                disabled={!(customOptionInput[`custom_${idx}`] || '').trim()}
                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {variantCombinations.length > 0 && (
                                <div className="space-y-4">
                                    {activeGroups.some((g) => g.key === 'length') && (
                                        <div className="rounded-xl border-2 border-violet-100 bg-violet-50/40 p-4">
                                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                                <div className="flex items-start gap-3">
                                                    <span className="w-9 h-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                                                        <i className="ri-line-chart-line text-lg"></i>
                                                    </span>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-gray-900">Length pricing curve</h5>
                                                        <p className="text-xs text-gray-600 max-w-md">
                                                            Set the base price for the shortest length, plus the step-up per length.
                                                            HairBudget will fill in every length row for you.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-2 flex-wrap">
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                            Base (GH₵)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={curveBase}
                                                            onChange={(e) => setCurveBase(e.target.value)}
                                                            placeholder="e.g. 500"
                                                            className="w-28 px-3 py-1.5 border border-violet-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                            + per length
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={curveStep}
                                                            onChange={(e) => setCurveStep(e.target.value)}
                                                            placeholder="e.g. 50"
                                                            className="w-28 px-3 py-1.5 border border-violet-200 rounded-lg text-sm focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={applyLengthPricingCurve}
                                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                                                    >
                                                        <i className="ri-magic-line"></i>
                                                        Apply to all lengths
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <i className="ri-grid-line text-lg text-violet-600"></i>
                                            Price & stock — {variantCombinations.length} variant
                                            {variantCombinations.length > 1 ? 's' : ''}
                                        </h4>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={autoFillVariantSkus}
                                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
                                                title="Generate SKUs like WIG-1B-18 based on the parent SKU + values"
                                            >
                                                <i className="ri-barcode-line"></i>
                                                Auto-SKU
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = prompt('Compare-at (was) price for ALL variants (GH₵):', '');
                                                    if (val !== null) bulkSetField('comparePrice', val);
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Bulk compare price
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = prompt('Regular price for ALL variants (GH₵):', price?.toString() || '0');
                                                    if (val !== null) bulkSetField('price', val);
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Bulk regular price
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = prompt('Sale price for ALL variants when site sale is ON (empty to clear):', '');
                                                    if (val !== null) bulkSetField('salePrice', val);
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Bulk sale price
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = prompt('Stock qty for ALL variants:', '0');
                                                    if (val !== null) bulkSetField('stock', val);
                                                }}
                                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Bulk stock
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700 w-16">
                                                        Image
                                                    </th>
                                                    {activeGroups.map((g, i) => (
                                                        <th key={i} className="text-left py-3 px-3 text-sm font-semibold text-gray-700">
                                                            {g.name}
                                                        </th>
                                                    ))}
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">SKU</th>
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">
                                                        Compare (GH₵)
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">
                                                        Regular (GH₵)
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">
                                                        Sale (GH₵)
                                                    </th>
                                                    <th className="text-center py-3 px-3 text-sm font-semibold text-gray-700">
                                                        Off %
                                                    </th>
                                                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-700">Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {variantCombinations.map((combo, rowIdx) => {
                                                    const d = variantData[combo.key] || emptyVariantRow();
                                                    const saleNum = parseFloat(d.price) || 0;
                                                    const origNum = parseFloat(d.comparePrice) || 0;
                                                    const hasOff = origNum > 0 && saleNum > 0 && origNum > saleNum;
                                                    const offPct = hasOff ? Math.round(((origNum - saleNum) / origNum) * 100) : 0;
                                                    const stockNum = parseInt(d.stock) || 0;
                                                    const flipImagePicker =
                                                        variantCombinations.length > 4 &&
                                                        rowIdx >= variantCombinations.length - 3;
                                                    return (
                                                        <tr key={combo.key} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="py-3 px-3 align-top">
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setImagePickerOpenFor(
                                                                                imagePickerOpenFor === combo.key ? null : combo.key,
                                                                            )
                                                                        }
                                                                        className="block w-12 h-12 rounded-lg border border-gray-200 overflow-hidden hover:ring-2 hover:ring-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                                                                        title={
                                                                            images.length === 0
                                                                                ? 'Upload images on the Images tab first'
                                                                                : 'Pick a photo for this variant'
                                                                        }
                                                                    >
                                                                        {d.imageUrl ? (
                                                                            <img
                                                                                src={d.imageUrl}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                                                                                <i className="ri-image-add-line text-lg"></i>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                    {imagePickerOpenFor === combo.key && (
                                                                        <>
                                                                            <div
                                                                                className="fixed inset-0 z-30"
                                                                                onClick={() => setImagePickerOpenFor(null)}
                                                                            />
                                                                            <div
                                                                                className={`absolute z-40 left-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-3 ${
                                                                                    flipImagePicker ? 'bottom-14' : 'top-14'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <span className="text-xs font-semibold text-gray-700">
                                                                                        Choose image
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setVariantImage(combo.key, '');
                                                                                            setImagePickerOpenFor(null);
                                                                                        }}
                                                                                        className="text-xs text-gray-500 hover:text-red-600"
                                                                                        disabled={!d.imageUrl}
                                                                                    >
                                                                                        <i className="ri-close-circle-line mr-0.5"></i>
                                                                                        Clear
                                                                                    </button>
                                                                                </div>
                                                                                {images.length === 0 ? (
                                                                                    <p className="text-xs text-gray-500 p-3 text-center bg-gray-50 rounded-lg">
                                                                                        No images uploaded yet. Add some on the
                                                                                        <strong className="mx-1">Images</strong> tab.
                                                                                    </p>
                                                                                ) : (
                                                                                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                                                                        {images.map((img: any, idx: number) => {
                                                                                            const isSelected = d.imageUrl === img.url;
                                                                                            return (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    key={idx}
                                                                                                    onClick={() => {
                                                                                                        setVariantImage(combo.key, img.url);
                                                                                                        setImagePickerOpenFor(null);
                                                                                                    }}
                                                                                                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition ${
                                                                                                        isSelected
                                                                                                            ? 'border-violet-500 ring-2 ring-violet-200'
                                                                                                            : 'border-gray-200 hover:border-violet-400'
                                                                                                    }`}
                                                                                                    title={`Use image ${idx + 1}`}
                                                                                                >
                                                                                                    <img
                                                                                                        src={img.url}
                                                                                                        alt=""
                                                                                                        className="w-full h-full object-cover"
                                                                                                    />
                                                                                                    {isSelected && (
                                                                                                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-violet-600 text-white rounded-full flex items-center justify-center">
                                                                                                            <i className="ri-check-line text-[10px]"></i>
                                                                                                        </span>
                                                                                                    )}
                                                                                                </button>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {combo.values.map((cell, vi) => (
                                                                <td key={vi} className="py-3 px-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            promptBulkByAxis(vi, activeGroups[vi].name, cell)
                                                                        }
                                                                        className="text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-violet-100 hover:text-violet-800 px-2.5 py-1 rounded whitespace-nowrap transition-colors"
                                                                        title={`Click to apply a value to every variant where ${activeGroups[vi].name} = ${cell}`}
                                                                    >
                                                                        {cell}
                                                                    </button>
                                                                </td>
                                                            ))}
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="text"
                                                                    value={d.sku}
                                                                    onChange={(e) =>
                                                                        updateVariantField(combo.key, 'sku', e.target.value)
                                                                    }
                                                                    className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                                                                    placeholder="auto"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="number"
                                                                    value={d.comparePrice}
                                                                    onChange={(e) =>
                                                                        updateVariantField(combo.key, 'comparePrice', e.target.value)
                                                                    }
                                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                                                                    step="0.01"
                                                                    placeholder="—"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="number"
                                                                    value={d.price}
                                                                    onChange={(e) =>
                                                                        updateVariantField(combo.key, 'price', e.target.value)
                                                                    }
                                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                                                                    step="0.01"
                                                                    placeholder={price?.toString() || '0'}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <input
                                                                    type="number"
                                                                    value={d.salePrice}
                                                                    onChange={(e) =>
                                                                        updateVariantField(combo.key, 'salePrice', e.target.value)
                                                                    }
                                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                                                                    step="0.01"
                                                                    placeholder="—"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-3 text-center">
                                                                {hasOff ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700">
                                                                        −{offPct}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-3">
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        value={d.stock}
                                                                        onChange={(e) =>
                                                                            updateVariantField(combo.key, 'stock', e.target.value)
                                                                        }
                                                                        className={`w-20 px-3 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 ${
                                                                            stockNum === 0
                                                                                ? 'border-red-200 bg-red-50 text-red-700'
                                                                                : stockNum < 3
                                                                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                                                : 'border-gray-300'
                                                                        }`}
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-slate-50 border-t border-gray-100 flex flex-wrap items-center gap-4">
                                        <p className="text-xs text-slate-800 flex items-center">
                                            <i className="ri-information-line mr-1.5"></i>
                                            Total stock:{' '}
                                            <strong className="ml-1">
                                                {variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)}
                                            </strong>
                                        </p>
                                        <p className="text-xs text-slate-600 flex items-center">
                                            <i className="ri-cursor-line mr-1.5"></i>
                                            Tip: click any colour or length pill above to bulk-apply a price or stock value
                                            to just that row of variants.
                                        </p>
                                        {images.length === 0 && (
                                            <p className="text-xs text-amber-700 flex items-center">
                                                <i className="ri-information-line mr-1.5"></i>
                                                Upload images on the <strong className="mx-1">Images</strong> tab to attach
                                                a specific photo to each colour / length.
                                            </p>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            )}

                            {variantCombinations.length === 0 && activeGroups.length === 0 && (
                                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <i className="ri-brush-line text-4xl text-gray-300 mb-3 block"></i>
                                    <p className="font-semibold text-gray-700">No variant-driving options enabled</p>
                                    <p className="text-sm mt-1 max-w-lg mx-auto">
                                        Turn on <strong>Creates variants</strong> for at least one option (usually hair length, or
                                        length × colour) to build the price/stock grid. Leave options on without “Creates variants”
                                        if you only want to show lace type or density as information on the PDP later.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}


                    {activeTab === 'images' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Product Media</h3>
                                <p className="text-gray-600">Add up to 10 images and/or videos. The first item is the primary media shown on the product page.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {images.map((img: any, index: number) => {
                                    const isVid = img.is_video || isVideoFile(img.url);
                                    return (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                                                {isVid ? (
                                                    <video
                                                        src={img.url}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        loop
                                                        preload="metadata"
                                                        onMouseEnter={(e) => {
                                                            const v = e.currentTarget as HTMLVideoElement;
                                                            v.play().catch(() => {});
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            const v = e.currentTarget as HTMLVideoElement;
                                                            v.pause();
                                                            v.currentTime = 0;
                                                        }}
                                                    />
                                                ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={img.url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="absolute top-2 left-2 flex gap-1">
                                                {index === 0 && (
                                                    <span className="bg-slate-700 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                                                        Primary
                                                    </span>
                                                )}
                                                {isVid && (
                                                    <span className="bg-violet-600 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                                                        <i className="ri-video-line text-xs"></i> Video
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 rounded-xl pointer-events-none">
                                                <a
                                                    href={img.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-9 h-9 flex items-center justify-center bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer pointer-events-auto"
                                                >
                                                    <i className="ri-eye-line"></i>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="w-9 h-9 flex items-center justify-center bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer pointer-events-auto"
                                                >
                                                    <i className="ri-delete-bin-line"></i>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {images.length < MAX_MEDIA && (
                                    <label
                                        className={`aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:border-slate-700 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center space-y-2 text-gray-600 hover:text-slate-700 cursor-pointer px-3 ${
                                            uploading ? 'opacity-70 cursor-wait' : ''
                                        }`}
                                    >
                                        {uploading ? (
                                            <i className="ri-loader-4-line animate-spin text-3xl"></i>
                                        ) : (
                                            <i className="ri-add-circle-line text-3xl"></i>
                                        )}
                                        <span className="text-sm font-semibold text-center">
                                            {uploading ? 'Uploading…' : 'Image or Video'}
                                        </span>
                                        {uploading && (
                                            <div className="w-full max-w-[9rem]">
                                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-600 transition-all duration-200"
                                                        style={{ width: `${Math.max(uploadProgress, 4)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1 text-center line-clamp-2">
                                                    {uploadStatus || `${uploadProgress}%`}
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-m4v,.mp4,.webm,.mov,.avi,.m4v"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            multiple
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                                <p className="text-sm text-gray-700">
                                    <strong>Images:</strong> JPG, PNG, WebP, GIF — min 1000×1000px works best. First item is the primary media.
                                </p>
                                <p className="text-sm text-gray-700">
                                    <strong>Videos:</strong> MP4, WebM, MOV, AVI — up to <strong>50 MB</strong> each.
                                    Prefer a short 720p MP4 (phone clips over 50 MB will be rejected). Hover to preview here;
                                    videos autoplay muted on the product page.
                                </p>
                                {uploadStatus && !uploading && (
                                    <p className="text-sm text-emerald-700 pt-1">
                                        <i className="ri-check-line mr-1"></i>
                                        {uploadStatus}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-6 max-w-3xl">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Search Engine Optimization</h3>
                                <p className="text-gray-600">Optimize how this product appears in search results</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Page Title
                                </label>
                                <input
                                    type="text"
                                    value={seoTitle}
                                    onChange={(e) => setSeoTitle(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                    placeholder="Seo friendly title"
                                />
                                <p className="text-sm text-gray-500 mt-2">60 characters recommended</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Meta Description
                                </label>
                                <textarea
                                    rows={3}
                                    maxLength={500}
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-none"
                                    placeholder="Seo friendly description"
                                />
                                <p className="text-sm text-gray-500 mt-2">160 characters recommended</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    URL Slug
                                </label>
                                <div className="flex items-center min-w-0">
                                    <span className="text-gray-600 bg-gray-100 px-4 py-3 border-2 border-r-0 border-gray-300 rounded-l-lg whitespace-nowrap">
                                        store.com/product/
                                    </span>
                                    <input
                                        type="text"
                                        value={urlSlug}
                                        onChange={(e) => setUrlSlug(e.target.value)}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        className="min-w-0 flex-1 px-4 py-3 border-2 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                        placeholder="product-slug"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Use lowercase letters, numbers, and dashes.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Keywords
                                </label>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                                    placeholder="keyword1, keyword2"
                                />
                                <p className="text-sm text-gray-500 mt-2">Separate keywords with commas</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
