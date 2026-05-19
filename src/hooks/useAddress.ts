import { useState, useCallback } from 'react';
import { LocationFields, parseLocation, serializeLocation, formatLocation } from '@/lib/address';

interface UseAddressOptions {
  initialValue?: string | null;
  onChange?: (serialized: string) => void;
}

interface UseAddressReturn {
  fields: LocationFields;
  setField: (key: keyof LocationFields, value: string) => void;
  setFields: (fields: LocationFields) => void;
  serialized: string;
  formatted: string;
  isEmpty: boolean;
  reset: () => void;
}

const EMPTY_FIELDS: LocationFields = { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' };

export function useAddress(options: UseAddressOptions = {}): UseAddressReturn {
  const [fields, setFieldsState] = useState<LocationFields>(() => 
    parseLocation(options.initialValue)
  );

  const setField = useCallback((key: keyof LocationFields, value: string) => {
    setFieldsState(prev => {
      const updated = { ...prev, [key]: value };
      options.onChange?.(serializeLocation(updated));
      return updated;
    });
  }, [options.onChange]);

  const setFields = useCallback((newFields: LocationFields) => {
    setFieldsState(newFields);
    options.onChange?.(serializeLocation(newFields));
  }, [options.onChange]);

  const reset = useCallback(() => {
    setFieldsState(EMPTY_FIELDS);
    options.onChange?.(serializeLocation(EMPTY_FIELDS));
  }, [options.onChange]);

  const serialized = serializeLocation(fields);
  const formatted = formatLocation(fields);
  const isEmpty = !fields.city && !fields.province && !fields.country && !fields.zip;

  return { fields, setField, setFields, serialized, formatted, isEmpty, reset };
}
