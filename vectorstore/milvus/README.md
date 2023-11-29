# Milvus

Using [Milvus][1] as the vector store.


## Installation

For how to install Milvus in different scenarios, see [Official Documents][2].

For testing purpose, here we choose to [Install Milvus Standalone with Docker Compose][3].

```bash
$ wget https://github.com/milvus-io/milvus/releases/download/v2.3.3/milvus-standalone-docker-compose.yml -O docker-compose.yml
$ sudo docker compose up -d
```


[1]: https://milvus.io/
[2]: https://milvus.io/docs/install_standalone-operator.md
[3]: https://milvus.io/docs/install_standalone-docker.md
