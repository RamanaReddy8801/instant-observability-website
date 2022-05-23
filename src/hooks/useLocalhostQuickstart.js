import { useEffect, useState } from 'react';
import { navigate } from 'gatsby';
import { useTessen } from '@newrelic/gatsby-theme-newrelic';

import { getQuickstartFilesFromLocal } from '../utils/preview/fetchHelpers';
import { parseRawQuickstartFiles } from '../utils/preview/parseHelpers';

const useLocalhostQuickstart = (location) => {
  const [quickstart, setQuickstart] = useState();
  const tessen = useTessen();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const port = urlParams.get('port') || 3000;

    tessen.track({
      eventName: 'localView',
      category: 'QuickstartPreview',
      local: true,
    });

    /*
     * Async function to get quickstart files from local
     * and set to state variable
     **/
    const fetchFiles = async () => {
      try {
        const rawFileContent = await getQuickstartFilesFromLocal(port);
        const quickstart = parseRawQuickstartFiles(rawFileContent);

        setQuickstart(quickstart);
      } catch (err) {
        tessen.track({
          eventName: 'fetchAndParseError',
          category: 'QuickstartPreview',
          local: true,
          error: error.message,
        });

        console.log(err.message);
        console.log('Please make sure your local preview server is running.');
        navigate('/');
        return;
      }
    };

    fetchFiles();
  }, []);

  return quickstart;
};

export default useLocalhostQuickstart;
