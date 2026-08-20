/**
 * EpisodeDetail — Type-specific body for an Episode: title block with series/SxEy
 * subtitle, play button, and shared sections
 */

import { CastSection } from "./CastSection";
import { EpisodeSubtitle } from "./EpisodeSubtitle";
import { GenresLine } from "./GenresLine";
import { MediaInfoSection } from "./MediaInfoSection";
import { MediaTitleBlock } from "./MediaTitleBlock";
import { OverviewSection } from "./OverviewSection";
import { PlayButton } from "./PlayButton";
import { StudiosSection } from "./StudiosSection";
import { JellyfinItem } from "../../../types/jellyfin";

interface EpisodeDetailProps {
  item: JellyfinItem;
}

export function EpisodeDetail({ item }: EpisodeDetailProps) {
  return (
    <>
      <MediaTitleBlock item={item} subtitle={<EpisodeSubtitle item={item} />} />
      <PlayButton item={item} />
      <GenresLine genres={item.Genres} />
      <OverviewSection overview={item.Overview} />
      <CastSection people={item.People} />
      <StudiosSection studios={item.Studios} />
      <MediaInfoSection mediaSources={item.MediaSources} />
    </>
  );
}
