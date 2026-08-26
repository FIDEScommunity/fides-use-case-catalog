<?php
/**
 * Video JSON-LD helpers. Google VideoObject requires name, description,
 * thumbnailUrl and uploadDate. Incomplete objects trigger Search Console
 * errors, so we omit the node when a required field cannot be derived.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Extract a YouTube video id from watch / youtu.be / embed / shorts / live URLs.
 */
function fides_use_case_catalog_youtube_video_id(string $url): string {
    $url = trim($url);
    if ($url === '') {
        return '';
    }
    if (preg_match(
        '~(?:youtube\.com/watch\?(?:[^#]*[&?])?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/shorts/|youtube\.com/live/)([A-Za-z0-9_-]{6,})~i',
        $url,
        $match
    ) === 1) {
        return (string) $match[1];
    }
    return '';
}

function fides_use_case_catalog_youtube_thumbnail_url(string $video_url): string {
    $id = fides_use_case_catalog_youtube_video_id($video_url);
    return $id !== '' ? 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg' : '';
}

function fides_use_case_catalog_youtube_embed_url(string $video_url): string {
    $id = fides_use_case_catalog_youtube_video_id($video_url);
    return $id !== '' ? 'https://www.youtube-nocookie.com/embed/' . $id : '';
}

/**
 * First playable video on a use-case item (`video`, then `videos[0]`).
 *
 * @param array<string, mixed> $item
 * @return array<string, mixed>
 */
function fides_use_case_catalog_primary_video(array $item): array {
    if (isset($item['video']) && is_array($item['video']) && ! empty($item['video']['url']) && is_string($item['video']['url'])) {
        return $item['video'];
    }
    if (isset($item['videos']) && is_array($item['videos'])) {
        foreach ($item['videos'] as $row) {
            if (is_array($row) && ! empty($row['url']) && is_string($row['url'])) {
                return $row;
            }
        }
    }
    return array();
}

/**
 * Google VideoObject for a use-case item, or null when required fields are missing.
 *
 * @param array<string, mixed> $item
 * @return array<string, mixed>|null
 */
function fides_use_case_catalog_video_object_for_jsonld(array $item): ?array {
    $video = fides_use_case_catalog_primary_video($item);
    $content_url = isset($video['url']) ? trim((string) $video['url']) : '';
    $name = isset($item['title']) ? trim((string) $item['title']) : '';
    if ($content_url === '' || $name === '') {
        return null;
    }

    $thumbnail = fides_use_case_catalog_youtube_thumbnail_url($content_url);
    if ($thumbnail === '') {
        $image = isset($item['imageUrl']) ? trim((string) $item['imageUrl']) : '';
        if ($image !== '' && preg_match('~^https?://~i', $image) === 1) {
            $thumbnail = $image;
        }
    }
    if ($thumbnail === '') {
        return null;
    }

    $description = '';
    if (! empty($item['summary']) && is_string($item['summary'])) {
        $description = trim($item['summary']);
    }
    if ($description === '') {
        $description = $name;
    }

    $upload_raw = '';
    if (! empty($item['publishedAt']) && is_string($item['publishedAt'])) {
        $upload_raw = $item['publishedAt'];
    } elseif (! empty($item['updatedAt']) && is_string($item['updatedAt'])) {
        $upload_raw = $item['updatedAt'];
    }
    $upload_ts = $upload_raw !== '' ? strtotime($upload_raw) : false;
    if (! $upload_ts) {
        return null;
    }

    $video_object = array(
        '@type'        => 'VideoObject',
        'name'         => $name,
        'description'  => $description,
        'thumbnailUrl' => $thumbnail,
        'uploadDate'   => gmdate('c', $upload_ts),
        'contentUrl'   => $content_url,
    );
    $embed = fides_use_case_catalog_youtube_embed_url($content_url);
    if ($embed !== '') {
        $video_object['embedUrl'] = $embed;
    }
    return $video_object;
}
