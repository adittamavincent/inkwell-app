import { useEffect } from 'react';

interface LocatorProviderProps {
  projectPath?: string;
}

export function LocatorProvider({ projectPath }: LocatorProviderProps) {
  const locatorEnabled = import.meta.env.DEV;

  useEffect(() => {
    if (locatorEnabled) {
      import('@locator/runtime').then((mod) => {
        const setupLocatorUI = mod.default;
        setupLocatorUI(
          projectPath
            ? {
                projectPath: projectPath,
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
  }, [locatorEnabled, projectPath]);

  return null;
}
