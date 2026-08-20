/**
 * GenericDetail — Fallback body for media types without dedicated handling
 * (BoxSet, Audio, Video, etc.): title block and shared sections only
 */

import { CastSection } from "./CastSection";
import { GenresLine } from "./GenresLine";
import { MediaInfoSection } from "./MediaInfoSection";
import { MediaTitleBlock } from "./MediaTitleBlock";
import { OverviewSection } from "./OverviewSection";
import { StudiosSection } from "./StudiosSection";
import { JellyfinItem } from "../../../types/jellyfin";

interface GenericDetailProps {
  item: JellyfinItem;
}

export function GenericDetail({ item }: GenericDetailProps) {
  return (
    <>
      <MediaTitleBlock item={item} />
      <GenresLine genres={item.Genres} />
      <OverviewSection overview={item.Overview} />
      <CastSection people={item.People} />
      <StudiosSection studios={item.Studios} />
      <MediaInfoSection mediaSources={item.MediaSources} />
    </>
  );
}
