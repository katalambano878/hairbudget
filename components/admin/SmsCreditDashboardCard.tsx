import Link from 'next/link';
import type { DashboardSmsCredit } from '@/lib/sms-credit-types';

type Props = {
  smsCredit: DashboardSmsCredit;
};

export function SmsCreditDashboardCard({ smsCredit }: Props) {
  const blinkLow = smsCredit.status === 'ok' && smsCredit.level === 'low';
  const blinkEmpty = smsCredit.status === 'ok' && smsCredit.level === 'empty';

  const borderClass =
    smsCredit.status === 'ok' && smsCredit.level === 'empty'
      ? 'border-red-200 hover:border-red-300'
      : smsCredit.status === 'ok' && smsCredit.level === 'low'
        ? 'border-amber-200 hover:border-amber-300'
        : 'border-ui-100 hover:border-ui-200';

  const iconAccent =
    smsCredit.status === 'ok' && smsCredit.level === 'empty'
      ? { bg: 'bg-red-500', text: 'text-red-500' }
      : smsCredit.status === 'ok' && smsCredit.level === 'low'
        ? { bg: 'bg-amber-500', text: 'text-amber-500' }
        : { bg: 'bg-blue-500', text: 'text-blue-500' };

  let mainValue: string;
  let subline: string | null = null;

  if (smsCredit.status === 'not_connected') {
    mainValue = 'SMS is not connected';
  } else if (smsCredit.status === 'load_failed') {
    mainValue = '—';
    subline = 'The balance could not be loaded';
  } else {
    mainValue = smsCredit.sms_left.toLocaleString('en-GH');
    if (smsCredit.level === 'low') {
      subline = 'Running low, top up soon';
    } else if (smsCredit.level === 'empty') {
      subline = 'SMS credit is empty, texts are not being sent';
    } else {
      subline = 'texts left';
    }
  }

  const sublineClass =
    smsCredit.status === 'ok' && smsCredit.level === 'empty'
      ? 'text-red-600 font-semibold'
      : smsCredit.status === 'ok' && smsCredit.level === 'low'
        ? 'text-amber-600 font-semibold'
        : 'text-ui-500';

  const showTopUp = smsCredit.status !== 'not_connected';
  const valueSizeClass =
    smsCredit.status === 'not_connected' ? 'text-sm font-bold leading-snug' : 'text-2xl font-black leading-none';

  return (
    <div
      className={`bg-white rounded-2xl p-5 border hover:shadow-sm transition-all group ${borderClass} ${
        blinkEmpty ? 'sms-credit-double-blink-empty' : blinkLow ? 'sms-credit-double-blink' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl ${iconAccent.bg} bg-opacity-10 flex items-center justify-center`}>
          <i className={`ri-message-2-line text-base ${iconAccent.text}`} aria-hidden />
        </div>
        {showTopUp ? (
          <Link
            href="/admin/sms-credit"
            className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-[10px] tracking-[0.15em] uppercase transition-colors shrink-0"
          >
            Top up
          </Link>
        ) : null}
      </div>
      <p className={`text-ui-900 mb-1.5 tabular-nums ${valueSizeClass}`}>{mainValue}</p>
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-ui-500">SMS credit</p>
      {subline ? <p className={`mt-2 text-xs ${sublineClass}`}>{subline}</p> : null}
    </div>
  );
}