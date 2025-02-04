import json

import click
import requests

# Global variable for authorization token
AUTH_TOKEN = ''
BASE_URL = 'https://api.sciencebase.gov/nabat-graphql/graphql'
QUERY = """
query batsAIAcousticInfoByFileBatchId {
  acousticFileBatchById(id: \"319479412\") {
    batchId
    acousticBatchByBatchId {
      softwareBySoftwareId {
        developer
        name
        versionNumber
      }
      classifierByClassifierId {
        createdDate
        description
        name
        public
        speciesClassifiersByClassifierId {
          nodes {
            speciesBySpeciesId {
              speciesCode
            }
          }
        }
      }
      surveyEventBySurveyEventId {
        createdBy
        createdDate
        eventGeometryByEventGeometryId {
          description
          geom {
            geojson
          }
        }
      }
      createdDate
      id
    }
    acousticFileByFileId {
      fileName
      recordingTime
      s3Verified
      sizeBytes
    }
    manualId
    recordingNight
    speciesByAutoId {
      id
      speciesCode
    }
    speciesByManualId {
      id
      speciesCode
    }
    autoId
  }
}
"""


@click.command()
def fetch_and_save():
    """Fetch data using GraphQL and save to output.json"""
    headers = {'Authorization': f'Bearer {AUTH_TOKEN}', 'Content-Type': 'application/json'}
    response = requests.post(BASE_URL, json={'query': QUERY}, headers=headers)

    if response.status_code == 200:
        data = response.json()
        with open('output.json', 'w') as f:
            json.dump(data, f, indent=2)
        click.echo('Data successfully fetched and saved to output.json')
    else:
        click.echo(f'Failed to fetch data: {response.status_code}, {response.text}')


if __name__ == '__main__':
    fetch_and_save()
