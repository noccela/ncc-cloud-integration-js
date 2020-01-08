/**
 * Get a callback function that calls the user provided callback
 * if the provided payload from cloud matches the filters.
 *
 * @param {Number} accountFilter Account for site.
 * @param {Number} siteFilter Site id for site.
 * @param {Object} additionalFilters Additional filters, ie. deviceIds.
 * @param {Function} callback User provided callback function.
 * @param {Object} logger Logger object.
 */
export function getLocationUpdateCallback(
    accountFilter,
    siteFilter,
    additionalFilters,
    callback,
    logger
) {
    const deviceIds = additionalFilters?.deviceIds;

    return payload => {
        for (const [siteIdentifier, response] of Object.entries(payload)) {
            const [account, site] = siteIdentifier.split("|").map(i => +i);
            if (accountFilter !== account || siteFilter !== site) {
                continue;
            }
            let filteredResponse = response;

            // Filter out devices locations from response that the user
            // did not subscribe to.
            if (deviceIds) {
                filteredResponse = response.filter(r =>
                    deviceIds.includes(+r["deviceId"])
                );
            }

            setTimeout(() => {
                try {
                    callback(null, filteredResponse);
                } catch (e) {
                    logger.exception("Error in location update callback", e);
                }
            }, 0);
        }
    };
}

export function getTagDiffStreamCallback(filters, callback, logger) {
    const deviceIds = filters?.deviceIds;

    // TODO: Account and site filters.

    return payload => {
        let filteredResponse = payload;
        if (deviceIds) {
            // TODO: Filter removedTags.
            // Only MAC addresses are received which makes it difficult.

            // Filter out irrelevant tags.
            filteredResponse["tags"] = Object.entries(filteredResponse["tags"])
                .filter(([mac, data]) => {
                    const deviceId = data["deviceId"];
                    return deviceIds.includes(+deviceId);
                })
                .reduce((obj, [mac, data]) => {
                    obj[mac] = data;
                    return obj;
                }, {});
        }

        setTimeout(() => {
            try {
                callback(null, filteredResponse);
            } catch (e) {
                logger.exception("Error in diff stream callback", e);
            }
        }, 0);
    };
}

/**
 * Wraps user provided callback with the provided filters and returns a
 * new callback that does the filtering implicitly for tag initial state
 * response.
 *
 * @param {Object} filters Request filters.
 * @param {Function} callback User provided callback.
 */
export function getTagInitialStateCallback(filters, callback, logger) {
    const deviceIds = filters?.deviceIds;

    // TODO: Account and site filters.

    return payload => {
        let filteredResponse = payload;

        if (deviceIds) {
            // Filter out irrelevant tags.
            filteredResponse = Object.keys(payload)
                .filter(k => deviceIds.includes(+k))
                .reduce((obj, key) => {
                    obj[key] = payload[key];
                    return obj;
                }, {});
        }

        setTimeout(() => {
            try {
                callback(null, filteredResponse);
            } catch (e) {
                logger.exception("Error in tag initial state callback", e);
            }
        }, 0);
    };
}
