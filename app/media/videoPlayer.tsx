/**
 * VideoPlayer — Renders the VideoView with a passed-in player instance.
 * Thin wrapper; all logic lives in the parent player.tsx.
 */

import { VideoPlayer as ExpoVideoPlayer, VideoView } from 'expo-video';
import React, { memo } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
                allowsFullscreen
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
    video: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
});