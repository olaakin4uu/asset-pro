'use client';

import { PrimeReactProvider as Provider } from 'primereact/api';

interface Props {
  children: React.ReactNode;
}

export function PrimeReactProvider({ children }: Props) {
  return (
    <Provider>
      {children}
    </Provider>
  );
}
