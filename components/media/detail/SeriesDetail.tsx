/**
 * SeriesDetail — Type-specific body for a Series: title block, season/episode list,
 * and shared sections (no play button — playback happens per-episode)
 */

import { useColors } from "../../../hooks/useColors";
import { JellyfinItem } from "../../../types/jellyfin";
import { CastSection } from "./CastSection";
import { GenresLine } from "./GenresLine";
import { MediaInfoSection } from "./MediaInfoSection";
import { MediaTitleBlock } from "./MediaTitleBlock";
import { OverviewSection } from "./OverviewSection";
import { SeasonsSection } from "./SeasonsSection";
import { StudiosSection } from "./StudiosSection";

interface SeriesDetailProps {
  item: JellyfinItem;
}

export function SeriesDetail({ item }: SeriesDetailProps) {
  const colors = useColors();

  return (
    <>
      <MediaTitleBlock item={item} />
      <GenresLine genres={item.Genres} />
      <OverviewSection overview={item.Overview} />
      <CastSection people={item.People} />
      <StudiosSection studios={item.Studios} />
      <SeasonsSection seriesId={item.Id} accentColor={colors.jellyfin} />
      <MediaInfoSection mediaSources={item.MediaSources} />
    </>
  );
}
