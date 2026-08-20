/**
 * VideoPlayer — Renders the VideoView with a passed-in player instance.
 * Thin wrapper; all logic lives in the parent player.tsx.
 */

import { VideoPlayer as ExpoVideoPlayer, VideoView } from "expo-video";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

interface VideoPlayerProps {
  player: ExpoVideoPlayer;
  toggleOverlay: () => void;
}

function VideoPlayer({ player, toggleOverlay }: VideoPlayerProps) {
  return (
    <TouchableOpacity
      style={styles.videoTouchable}
      activeOpacity={1}
      onPress={toggleOverlay}
    >
      <VideoView
        style={styles.video}
        player={player}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        nativeControls={false}
      />
    </TouchableOpacity>
  );
}

export default memo(VideoPlayer);

const styles = StyleSheet.create({
  videoTouchable: {
    flex: 1,
  },
  // flex: 1 (filling the already flex: 1 touchable) instead of hardcoded
  // literal dimensions — those were read once from Dimensions.get("window")
  // at module load, so they went stale on rotation/resize and could be
  // wrong entirely on a tablet or split-screen window where this view
  // isn't actually the full screen size.
  video: {
    flex: 1,
  },
});
