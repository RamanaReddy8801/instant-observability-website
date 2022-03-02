import PropTypes from 'prop-types';
import React from 'react';
import QuickstartsPage from '../components/QuickstartsPage';
import customEventTrack from '../utils/customNewRelicEvent';

const NERDGRAPH_URL = process.env.NERDGRAPH_URL;
const NEW_RELIC_API_KEY = process.env.NEW_RELIC_API_KEY;

export const getServerData = async ({ query }) => {
  const sortParam = query.sort || 'RELEVANCE';

  const QUICKSTARTS_QUERY = `
query getQuickstarts($sortBy: Nr1CatalogSearchSortOption){
  actor {
    nr1Catalog {
      search(sortBy: $sortBy, filter: {types: QUICKSTART}) {
        totalCount
        results {
          ... on Nr1CatalogQuickstart {
            id
            supportLevel
            featured
            metadata {
              summary
              displayName
              slug
              icon {
                url
              }
            }
          }
        }
      }
    }
  }
}
`;

  try {
    const resp = await fetch(NERDGRAPH_URL, {
      method: 'POST',
      body: JSON.stringify({
        query: QUICKSTARTS_QUERY,
        variables: { sortBy: sortParam },
      }),
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': NEW_RELIC_API_KEY,
      },
    });

    if (!resp.ok) {
      throw Error(`Non 200 status code returned`, resp.status, resp.statusText);
    }

    const json = await resp.json();

    if (json.errors) {
      throw new Error(`Errors returned from nerdgraph`, json.errors);
    }
    const results = json.data?.actor?.nr1Catalog?.search?.results;

    /* eslint-disable-next-line no-console */
    console.log(`Found ${results?.length} quickstarts`);

    customEventTrack('NerdGraphRequest', {
      success: true,
      ...query,
    });

    return {
      props: {
        error: false,
        data: results,
      },
    };
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.error(err);

    customEventTrack('NerdGraphRequest', {
      success: false,
      errorMessage: err,
      ...query,
    });

    return {
      props: {
        error: true,
      },
    };
  }
};

const QuickstartsPageSSR = ({ serverData, location }) => {
  return (
    <QuickstartsPage
      errored={serverData.error}
      quickstarts={serverData.data}
      location={location}
    />
  );
};

QuickstartsPageSSR.propTypes = {
  serverData: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};

export default QuickstartsPageSSR;