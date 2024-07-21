interface PlayStatus {
    device: {
        id: string,
        is_active: boolean,
        is_private_session: boolean,
        is_restricted: boolean,
        name: string,
        type: string,
        volume_percent: number,
        supports_volume: boolean
    },
    repeat_state: string,
    shuffle_state: boolean,
    context: {
        type: string,
        href: string,
        external_urls: {
            spotify: string
        },
        uri: string
    },
    timestamp: number;
    progress_ms: number;
    is_playing: boolean;
    item: {
        album: {
            album_type: string,
            total_tracks: number,
            available_markets: string[],
            external_urls: {
                spotify: string
            },
            href: string,
            id: string,
            images: Image[],
            name: string,
            release_date: string,
            release_date_precision: string,
            restrictions: {
                reason: string
            },
            type: string,
            uri: string,
            artists: SimplifiedArtist[]
        },
        artists: Artist[],
        available_markets: string[],
        disc_number: number,
        duration_ms: number,
        explicit: boolean,
        external_ids: {
            isrc: string,
            ean: string,
            upc: string
        },
        external_urls: {
            spotify: string
        },
        href: string,
        id: string,
        is_playable: boolean,
        linked_from: {},
        restrictions: {
            reason: string
        },
        name: string,
        popularity: number,
        preview_url: string,
        track_number: number,
        type: string,
        uri: string,
        is_local: boolean
    };
    currently_playing_type: string,
    actions: {
        interrupting_playback: boolean,
        pausing: boolean,
        resuming: boolean,
        seeking: boolean,
        skipping_next: boolean,
        skipping_prev: boolean,
        toggling_repeat_context: boolean,
        toggling_shuffle: boolean,
        toggling_repeat_track: boolean,
        transferring_playback: boolean
    };
}

interface Image {
    url: string;
    height: number;
    width: number;
}

interface SimplifiedArtist {
    external_urls: {
        spotify: string
    },
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
}

interface Artist {
    external_urls: {
        spotify: string
    },
    followers: {
        href: string,
        total: number
    },
    genres: string[];
    href: string;
    id: string;
    images: Image[];
    name: string,
    popularity: 0,
    type: string,
    uri: string
}