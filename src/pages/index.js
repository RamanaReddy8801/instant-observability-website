import PropTypes from 'prop-types';
import React from 'react';
import QuickstartsPage from '../components/QuickstartsPage';
import customEventTrack from '../utils/customNewRelicEvent';

const NERDGRAPH_URL = process.env.NERDGRAPH_URL;
const NEW_RELIC_API_KEY = process.env.NEW_RELIC_API_KEY;

export const getServerData = async ({ query }) => {
  const sortParam = query.sort || 'RELEVANCE';
  const searchParam = query.search;
  const categoryParam =
    !query.category || query.category === '' ? [] : query.category.split(',');

  const QUICKSTARTS_QUERY = `
query getQuickstarts($sortBy: Nr1CatalogSearchSortOption, $query: String, $categories: [String!]) {
  actor {
    nr1Catalog {
      search(sortBy: $sortBy, filter: {types: QUICKSTART, categories: $categories}, query: $query) {
        results {
          ... on Nr1CatalogQuickstart {
            id
            supportLevel
            featured
            metadata {
              summary
              keywords
              displayName
              slug
              icon {
                url
              }
            }
          }
        }
        facets {
          categories {
            count
            displayName
          }
        }
      }
    }
  }
}
`;

  const FACET_QUERY = `{
  actor {
    nr1Catalog {
      categories {
        displayName
        terms
      }
      search(filter: {types: QUICKSTART}) {
        totalCount
        facets {
          categories {
            count
            displayName
          }
        }
      }
    }
  }
}`;

  try {
    const resp = await fetch(NERDGRAPH_URL, {
      method: 'POST',
      body: JSON.stringify([
        {
          id: 'quickstartsQuery',
          query: QUICKSTARTS_QUERY,
          variables: {
            sortBy: sortParam,
            query: searchParam,
            categories: categoryParam,
          },
        },
        {
          id: 'facetsQuery',
          query: FACET_QUERY,
        },
      ]),
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': NEW_RELIC_API_KEY,
      },
    });

    if (!resp.ok) {
      throw Error(`Non 200 status code returned`, resp.status, resp.statusText);
    }

    const json = await resp.json();

    const results = json.reduce((acc, queryResponse) => {
      if (queryResponse.payload.errors) {
        console.log({ errors: queryResponse.payload.errors });
        throw new Error(
          `Errors returned from nerdgraph`,
          queryResponse.payload.errors
        );
      }
      acc = {
        ...acc,
        [queryResponse.id]: queryResponse.payload.data.actor.nr1Catalog,
      };
      return acc;
    }, {});
    /* eslint-disable-next-line no-console */
    console.log(`Found ${results.facetsQuery?.search?.totalCount} quickstarts`);

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
      serverData={serverData.data}
      location={location}
    />
  );
};

QuickstartsPageSSR.propTypes = {
  serverData: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};

export default QuickstartsPageSSR;
