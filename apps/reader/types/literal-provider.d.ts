import type { PropsWithChildren, ReactNode } from 'react';

declare module '@literal-ui/core' {
  // Augment the LiteralProvider type to accept children
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface LiteralProviderProps {
    children?: ReactNode | ReactNode[] | any | undefined ;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LiteralProvider: React.FC<LiteralProviderProps>;
  export { LiteralProvider };
}
