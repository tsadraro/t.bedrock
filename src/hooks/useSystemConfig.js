import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CONFIG_DEFAULTS } from '@/lib/config';

let cachedConfig = null;

export function useSystemConfig() {
  const [config, setConfig] = useState(cachedConfig || CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) return;
    base44.entities.SystemConfig.list().then(records => {
      const map = { ...CONFIG_DEFAULTS };
      records.forEach(r => {
        const raw = r.value;
        if (raw === 'true') map[r.key] = true;
        else if (raw === 'false') map[r.key] = false;
        else if (!isNaN(raw) && raw !== '') map[r.key] = Number(raw);
        else map[r.key] = raw;
      });
      cachedConfig = map;
      setConfig(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { config, loading };
}