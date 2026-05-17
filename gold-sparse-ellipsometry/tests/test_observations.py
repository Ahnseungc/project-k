import numpy as np

from gse.obs.stokes import diffuse_obs, diffuse_pol_alpha, specular_dominant, stokes_from_channels


def test_eq_16_18_roundtrip():
    h, w = 8, 8
    s = np.array([1.0, 0.2, 0.1, 0.0])
    analysis = np.array(
        [[1, 1, 0, 0], [1, -1, 0, 0], [1, 0, 1, 0], [1, 0, -1, 0]],
        dtype=np.float64,
    )
    I0, I90, I45, I135 = [np.full((h, w), row) for row in analysis @ s]

    Id = diffuse_obs(I90)
    Ialpha = diffuse_pol_alpha(I45, I135)
    Is = specular_dominant(I0, I90)

    np.testing.assert_allclose(Id, 2 * I90, rtol=1e-6)
    np.testing.assert_allclose(Ialpha, I135 - I45, rtol=1e-6)
    np.testing.assert_allclose(Is, I0 - I90, rtol=1e-6)


def test_stokes_from_channels_invertible():
    s_true = np.array([1.0, 0.3, 0.1, 0.0])
    analysis = np.array(
        [[1, 1, 0, 0], [1, -1, 0, 0], [1, 0, 1, 0], [1, 0, -1, 0]],
        dtype=np.float64,
    )
    I0, I90, I45, I135 = [np.full((4, 4), v) for v in analysis @ s_true]
    s = stokes_from_channels(I0, I90, I45, I135)
    assert s.shape == (4, 4, 4)
    np.testing.assert_allclose(s[:, 0, 0], s_true, rtol=1e-4)
