/**
 * Detects the platform from which the user is accessing the application
 * @returns 'web' | 'mobile' | 'tablet' | 'desktop'
 */
export const detectPlatform = (): string => {
    if (typeof window === 'undefined') {
        return 'web';
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';

    // Check for mobile devices
    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Check for tablets
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);

    // Check for desktop platforms
    const isDesktop = /win|mac|linux/i.test(platform) && !isMobile && !isTablet;

    if (isMobile) {
        return 'mobile';
    } else if (isTablet) {
        return 'tablet';
    } else if (isDesktop) {
        return 'desktop';
    }

    return 'web';
};

/**
 * Generates a unique device identifier and stores it in localStorage
 * Uses UUID v4 combined with platform information for better uniqueness
 * If a deviceId already exists, it returns the existing one
 * @returns string - unique device identifier
 */
export const getDeviceId = (): string => {
    if (typeof window === 'undefined') {
        return 'server-side';
    }

    const DEVICE_ID_KEY = 'device_id';

    // Check if deviceId already exists in localStorage
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        // Generate a new unique device ID using UUID and platform
        deviceId = generateSecureDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
};

/**
 * Generates a secure unique identifier using UUID v4 and platform information
 * Format: {uuid}-{platform}-{browserFingerprint}
 * @returns string - secure unique identifier
 */
const generateSecureDeviceId = (): string => {
    // Use crypto.randomUUID if available (modern browsers), otherwise fallback
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : generateFallbackUUID();

    const platform = detectPlatform();
    const browserFingerprint = getBrowserFingerprint();

    return `${uuid}-${platform}-${browserFingerprint}`;
};

/**
 * Fallback UUID v4 generator for browsers that don't support crypto.randomUUID
 * @returns string - UUID v4 format
 */
const generateFallbackUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Generates a browser fingerprint based on available browser characteristics
 * @returns string - browser fingerprint hash
 */
const getBrowserFingerprint = (): string => {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        (navigator as any).deviceMemory || 0,
    ];

    // Simple hash function
    const hash = components.join('|').split('').reduce((acc, char) => {
        const chr = char.charCodeAt(0);
        acc = ((acc << 5) - acc) + chr;
        return acc & acc;
    }, 0);

    return Math.abs(hash).toString(36);
};
