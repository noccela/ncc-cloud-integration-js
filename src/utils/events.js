import { parseTagLiveData } from "./messagepack";

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

export function getTagDiffStreamCallback(
    accountFilter,
    siteFilter,
    additionalFilters,
    callback,
    logger
) {
    const deviceIds = additionalFilters?.deviceIds;

    return payload => {
        const tagsResponse = payload["tags"];
        tagsResponse;
    };
}

export function getTagInitialStateCallback(
    accountFilter,
    siteFilter,
    additionalFilters,
    callback,
    logger
) {
    const deviceIds = additionalFilters?.deviceIds;

    return payload => {
        let liveData, error;
        try {
            liveData = parseTagLiveData(payload);
        } catch (e) {
            error = e;
        }

        setTimeout(() => {
            try {
                callback(error, liveData);
            } catch (e) {
                logger.exception("Error in live data callback", e);
            }
        }, 0);
    };
}
