/**
 * MovieDetail — Type-specific body for a Movie: title block, play button, and shared sections
 */

import { CastSection } from "./CastSection";
import { GenresLine } from "./GenresLine";
import { MediaInfoSection } from "./MediaInfoSection";
import { MediaTitleBlock } from "./MediaTitleBlock";
import { OverviewSection } from "./OverviewSection";
import { PlayButton } from "./PlayButton";
import { StudiosSection } from "./StudiosSection";
import { JellyfinItem } from "../../../types/jellyfin";

interface MovieDetailProps {
  item: JellyfinItem;
}

export function MovieDetail({ item }: MovieDetailProps) {
  return (
    <>
      <MediaTitleBlock item={item} />
      <PlayButton item={item} />
      <GenresLine genres={item.Genres} />
      <OverviewSection overview={item.Overview} />
      <CastSection people={item.People} />
      <StudiosSection studios={item.Studios} />
      <MediaInfoSection mediaSources={item.MediaSources} />
    </>
  );
}
