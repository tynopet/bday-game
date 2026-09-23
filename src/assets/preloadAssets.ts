import { preloadSounds } from "../audio/audio";

const imageAssets = import.meta.glob(
  "../../assets/*.{gif,jpeg,jpg,png,svg,webp}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

export interface PreloadProgress {
  loaded: number;
  total: number;
}

function preloadImage(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      image.decode().catch(() => undefined).finally(resolve);
    };
    image.onerror = () => reject(new Error(`Image could not be loaded: ${source}`));
    image.src = source;
  });
}

export async function preloadGameAssets(
  onProgress: (progress: PreloadProgress) => void,
): Promise<void> {
  const tasks = [
    ...Object.values(imageAssets).map((source) => () => preloadImage(source)),
    ...preloadSounds(),
  ];
  let loaded = 0;

  onProgress({ loaded, total: tasks.length });

  const results = await Promise.allSettled(
    tasks.map((startLoading) =>
      startLoading().finally(() => {
        loaded += 1;
        onProgress({ loaded, total: tasks.length });
      }),
    ),
  );
  const failedAssets = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failedAssets.length > 0) {
    console.warn(
      `${failedAssets.length} game asset(s) could not be preloaded`,
      failedAssets.map((result) => result.reason),
    );
  }
}
