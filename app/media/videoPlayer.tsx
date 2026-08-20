/**
 * VideoPlayer — Renders the VideoView with a passed-in player instance.
 * Thin wrapper; all logic lives in the parent player.tsx.
 */

import { VideoPlayer as ExpoVideoPlayer, VideoView } from "expo-video";
import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface VideoPlayerProps {
  player: ExpoVideoPlayer;
  toggleOverlay: () => void;
}

function VideoPlayer({ player, toggleOverlay }: VideoPlayerProps) {
  // A plain TouchableOpacity wrapping VideoView never fired on Android —
  // RN's legacy Touchable/Responder system doesn't reliably receive touches
  // over a native video surface (this held even with surfaceType set to
  // 'textureView', so it's the responder system itself, not surface
  // compositing). GestureDetector uses react-native-gesture-handler's
  // native gesture-arena recognizer instead, which composes correctly over
  // complex native views the way the bridge-based responder system doesn't
  // — the same mechanism playerOverlay.tsx already relies on for its own
  // tap handling.
  const tapGesture = useMemo(
    () => Gesture.Tap().onEnd(toggleOverlay).runOnJS(true),
    [toggleOverlay],
  );

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={styles.videoTouchable}>
        <VideoView
          style={styles.video}
          player={player}
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
          nativeControls={false}
          // Android only (no-op on iOS) — kept alongside the gesture-handler
          // switch above since 'surfaceView' (the default) is documented to
          // cause issues specifically with overlapping video views.
          surfaceType="textureView"
        />
      </View>
    </GestureDetector>
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
