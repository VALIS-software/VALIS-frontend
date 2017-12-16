#!/usr/bin/env python
# -*- coding: utf-8 -*-

import glob
import json
import logging
from threading import Lock
import re
import os

import bcolz

_data = {}
_data_cache = {}
_lock = Lock()

# Static genome data directory path
DATA_DIR = os.path.join(os.getenv('HOME'), 'data/elastic-genome-data')

# Data repos
DATA_SOURCES = {
    'GM12878-DNase': 'DNASE.GM12878.fc.signal.bigwig',
    'K562-DNase': 'DNASE.K562.fc.signal.bigwig',
    'MCF7-DNase': 'DNASE.MCF-7.fc.signal.bigwig',
    'sequence': 'hg19.genome.fa',
}


def _load_data(root_data_dir, data_sources):
    global _data
    for (data_key, data_dirname) in data_sources.items():
        logging.info('Loading {} {}'.format(data_key, data_dirname))
        data_path = os.path.join(root_data_dir, data_dirname)
        _data[data_key] = _load_directory(data_path, True, False)


def _load_directory(base_dir, in_memory, use_cache):
    """Load a bcolz genome-wide data directory.

    Args:
        base_dir: string, the directory to load
        in_memory: bool, whether to copy the data to memory
        use_cache: bool, whether to use the global shared dataset cache
    """
    global _data_cache

    if not os.path.isdir(base_dir):
        raise IOError(
            'Base directory must be a directory: {}'.format(base_dir))

    if use_cache:
        # We need to make sure the path is correct, e.g. if trailing slashes
        # are/aren't included
        esc_sep = re.escape(os.sep)
        base_dir_key = re.sub(
            '{}{}+'.format(esc_sep, esc_sep), os.sep, base_dir)
        base_dir_key = base_dir_key.rstrip(os.sep)

        with _lock:
            if base_dir_key in _data_cache:  # cache hit
                return _data_cache[base_dir_key]

    with open(os.path.join(base_dir, 'metadata.json'), 'r') as fp:
        metadata = json.load(fp)

    file_shapes = {}
    chrom_dirs = set(
        map(os.path.basename, glob.glob(os.path.join(base_dir, '*'))))
    for chrom_dir, shape in metadata['file_shapes'].items():
        if chrom_dir not in chrom_dirs:
            logging.warn('Directory {} had shape specified ({}) but no data. Skipping.'.format(
                chrom_dir, shape))
        else:
            file_shapes[chrom_dir] = shape

    if metadata['type'] == 'array_bcolz':
        data = {chrom: bcolz.open(os.path.join(base_dir, chrom), mode='r')
                for chrom in file_shapes}

        for chrom, shape in file_shapes.items():
            if data[chrom].shape != tuple(shape):
                raise ValueError('Inconsistent shape found in metadata file: '
                                 '{} - {} vs {}'.format(chrom, shape,
                                                        data[chrom].shape))
    elif metadata['type'] in {'vplot_bcolz', 'array_2D_transpose_bcolz'}:
        data = {chrom: Array2D(os.path.join(base_dir, chrom), mode='r')
                for chrom in next(os.walk(base_dir))[1]}
        for chrom, shape in file_shapes.items():
            if data[chrom].shape != tuple(shape):
                raise ValueError('Inconsistent shape found in metadata file: '
                                 '{} - {} vs {}'.format(chrom, shape,
                                                        data[chrom].shape))
    else:
        raise IOError('Only bcolz arrays are supported.')

    if in_memory:
        data = {k: data[k].copy() for k in data.keys()}

    # cache the data here, so in-memory copies are kept if loaded
    if use_cache:
        with _lock:
            _data_cache[base_dir_key] = data

    return data


class Array2D(object):
    """Representation for 2D arrays (we want row-major storage)."""

    def __init__(self, rootdir, mode='r'):
        self._arr = bcolz.open(rootdir, mode=mode)

    def __getitem__(self, key):
        r, c = key
        return self._arr[c, r].T

    def __setitem__(self, key, item):
        r, c = key
        self._arr[c, r] = item

    @property
    def shape(self):
        return self._arr.shape[::-1]

    @property
    def ndim(self):
        return self._arr.ndim

    def copy(self):
        self._arr = self._arr.copy()
        return self


def get(data_key, chrom, start, stop):
    d = _data[data_key][str(chrom)]
    if len(d.shape) == 1:
        return d[start:stop]
    else:
        return d[:, start:stop]


def keys():
    return DATA_SOURCES.keys()


_load_data(DATA_DIR, DATA_SOURCES)
