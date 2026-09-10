import { useEffect } from 'react';

interface LocatorProviderProps {
  projectPath?: string;
}

export function LocatorProvider({ projectPath }: LocatorProviderProps) {
  const resolvedPath = projectPath || process.env.NEXT_PUBLIC_PROJECT_PATH;
  const locatorEnabled = import.meta.env.DEV;

  useEffect(() => {
    if (locatorEnabled) {
      import('@locator/runtime').then((mod) => {
        const setupLocatorUI = mod.default;
        setupLocatorUI(
          resolvedPath
            ? {
                projectPath: resolvedPath,
                targets: {
                  antigravity: {
                    url: 'antigravity-ide://file/${projectPath}${filePath}:${line}:${column}',
                    label: 'Antigravity IDE',
                  },
                  zed: {
                    url: 'zed://file/${projectPath}${filePath}:${line}:${column}',
                    label: 'Zed',
                  },
                },
              }
            : {
                targets: {
                  antigravity: {
                    url: 'antigravity-ide://file/${projectPath}${filePath}:${line}:${column}',
                    label: 'Antigravity IDE',
                  },
                  zed: {
                    url: 'zed://file/${projectPath}${filePath}:${line}:${column}',
                    label: 'Zed',
                  },
                },
              }
        );
      });
    }
  }, [locatorEnabled, resolvedPath]);

  return null;
}
