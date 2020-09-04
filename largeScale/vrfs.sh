# ubuntu v20
# build vrfs
sudo apt-get update && sudo apt-get install -y fuse3 libfuse3-dev build-essential cmake

# clone code and build
git clone https://github.com/JinmingHu-MSFT/Virtual-Random-File.git && cd Virtual-Random-File/

mkdir build && cd build/ && cmake .. -DCMAKE_BUILD_TYPE=Release && cmake --build .

# run binary
mkdir mnt
#./vrfs 20TB mnt &
./vrfs $1 mnt &

# test read speed
# dd bs=16K count=$((65536*10)) if=mnt/testfile of=/dev/null
