//     import { forwardRef } from 'react';
    
//     interface LiquidGlassWrapperProps {
//       children: React.ReactNode;
//       liquidGlass?: boolean;
//       className?: string;
//       style?: React.CSSProperties;
//     }
// const LiquidGlassWrapper = forwardRef<HTMLDivElement, LiquidGlassWrapperProps>(
//     ({ children, liquidGlass, className, style, ...props }, ref) => {
//                     const glassClass = liquidGlass
//                     ? 'bg-white/30 backdrop-blur-md border border-white/30 shadow-lg rounded-xl'
//                     : 'bg-white/80';
//         return (
//             <div
//             ref={ref}
//             className={`${className} ${glassClass}`.trim()}
//             style={style}
//             {...props}
//             >
//         {children}
//       </div>
//     );
// }
// );

// export default LiquidGlassWrapper;
// LiquidGlassWrapper.displayName = 'LiquidGlassWrapper';

// import { forwardRef } from 'react';

// interface LiquidGlassWrapperProps {
//   children: React.ReactNode;
//   liquidGlass?: boolean;
//   variant?: 'default' | 'frosted' | 'ultra' | 'minimal';
//   className?: string;
//   style?: React.CSSProperties;
//   [key: string]: any;
// }

// const LiquidGlassWrapper = forwardRef<HTMLDivElement, LiquidGlassWrapperProps>(
//   ({ children, liquidGlass = true, variant = 'default', className = '', style, ...props }, ref) => {
    
//     const variants = {
//       default: 'bg-white/40 backdrop-blur-xl border border-white/20 ',
//       frosted: 'bg-white/30 backdrop-blur-2xl border border-white/10 ',
//       ultra: 'bg-gradient-to-br from-white/50 to-white/30 backdrop-blur-3xl border border-white/30 ',
//       minimal: 'bg-white/20 backdrop-blur-lg border border-white/10 '
//     };

//     const glassClass = liquidGlass
//       ? `${variants[variant]} rounded-2xl transition-all duration-300 hover:bg-white/50 hover:shadow-[0_8px_40px_0_rgba(143,181,28,0.25)]`
//       : 'bg-white rounded-lg';

//     return (
//       <div
//         ref={ref}
//         className={`${glassClass} ${className}`.trim()}
//         style={{
//           ...style,
//           ...(liquidGlass && {
//             WebkitBackdropFilter: 'blur(20px)',
//                inset: 0,
//             // width: '100%',
//             // height: '100%',
//             // display: 'flex',
//             overflow: 'hidden',
//             // position: 'absolute',
//             // background: 'rgba(255,255,255,0.25)',
//             boxShadow: '2px 2px 1px 0 #ffffff30 inset, -1px -1px 1px 1px #ffffff4d inset',
//             // alignItems: 'center',
//             // paddingTop: 8,
//             // paddingLeft: 8,
//             // paddingRight: 8,
//             // flexDirection: 'row',
//             // paddingBottom: 8,
//             // justifyContent: 'flex-end',
//             scrollbarWidth: 'none',
//             // borderTopLeftRadius: 'inherit',
//             // borderTopRightRadius: 'inherit',
//             // borderBottomLeftRadius: 'inherit',
//             // borderBottomRightRadius: 'inherit',
//             overflowX: 'hidden',
//             overflowY: 'hidden',
//           })
//         }}
//         {...props}
//       >
//         {children}
//       </div>
//     );
//   }
// );

// LiquidGlassWrapper.displayName = 'LiquidGlassWrapper';

// export default LiquidGlassWrapper;


import { forwardRef } from 'react';

interface LiquidGlassWrapperProps {
  children: React.ReactNode;
  liquidGlass?: boolean;
  variant?: 'default' | 'frosted' | 'ultra' | 'minimal';
  className?: string;
  style?: React.CSSProperties;
//   [key: string]: any;
}

const LiquidGlassWrapper = forwardRef<HTMLDivElement, LiquidGlassWrapperProps>(
  ({ children, liquidGlass = true, variant = 'default', className = '', style, ...props }, ref) => {
    
    const variants = {
      default: 'backdrop-blur-xl border border-white/20',
      frosted: 'backdrop-blur-2xl border border-white/10',
      ultra: 'backdrop-blur-3xl border border-white/30',
      minimal: 'backdrop-blur-lg border border-white/10'
    };

    const glassClass = liquidGlass
      ? `${variants[variant]} rounded-2xl transition-all duration-300 hover:bg-[#8FB51C]/15 relative overflow-hidden glass-wrapper !shadow-lg`
      : 'bg-white rounded-lg';

    const glassStyle: React.CSSProperties = liquidGlass ? {
      background: 'rgba(255, 255, 255, 0.25)',
      boxShadow: '2px 2px 1px 0 rgba(255, 255, 255, 0.19) inset, -1px -1px 1px 1px rgba(255, 255, 255, 0.30) inset, 0 8px 32px 0 rgba(143, 181, 28, 0.15)',
      WebkitBackdropFilter: 'blur(20px)',
      backdropFilter: 'blur(20px)',
      scrollbarWidth: 'none' as const,
    } : {};

    return (
      <>
        {liquidGlass && (
          <style>{`
            .glass-wrapper:hover {
              box-shadow: 2px 2px 1px 0 rgba(255, 255, 255, 0.19) inset, 
                          -1px -1px 1px 1px rgba(255, 255, 255, 0.30) inset, 
                          0 8px 40px 0 rgba(143, 181, 28, 0.35) !important;
            }
          `}</style>
        )}
        <div
          ref={ref}
          className={`${glassClass} ${className}`.trim()}
          style={{
            ...glassStyle,
            ...style,
          }}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);

LiquidGlassWrapper.displayName = 'LiquidGlassWrapper';

export default LiquidGlassWrapper;