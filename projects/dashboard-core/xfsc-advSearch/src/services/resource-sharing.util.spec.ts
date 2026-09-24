import { getResourceSharingParams } from './resource-sharing.util';

describe('resource-sharing util', () => {
  it('should extract sharingMethodId and offeringType from credential subject', () => {
    expect(
      getResourceSharingParams({
        credentialSubject: {
          'simpl:generalServiceProperties': {
            'simpl:sharingMethodId': 'HttpData',
            'simpl:offeringType': 'data',
          },
        },
      }),
    ).toEqual({
      sharingMethodId: 'HttpData',
      offeringType: 'DATA',
    });
  });

  it('should unwrap @value nodes', () => {
    expect(
      getResourceSharingParams({
        credentialSubject: {
          'simpl:generalServiceProperties': {
            'simpl:sharingMethodId': { '@value': 'HttpData' },
            'simpl:offeringType': { '@value': 'DATA' },
          },
        },
      }),
    ).toEqual({
      sharingMethodId: 'HttpData',
      offeringType: 'DATA',
    });
  });

  it('should return null when required fields are missing', () => {
    expect(
      getResourceSharingParams({
        credentialSubject: {
          'simpl:generalServiceProperties': {
            'simpl:sharingMethodId': 'HttpData',
          },
        },
      }),
    ).toBeNull();
  });
});
