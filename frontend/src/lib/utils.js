export const formatCurrency = (amount, currency = 'TZS') => {
  const num = parseFloat(amount) || 0;
  return `${currency} ${num.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const daysUntilExpiry = (expiryDate) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

export const expiryStatus = (expiryDate) => {
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return { label: 'Expired', color: 'danger' };
  if (days <= 30) return { label: `${days}d left`, color: 'danger' };
  if (days <= 60) return { label: `${days}d left`, color: 'warning' };
  return { label: `${days}d left`, color: 'success' };
};
